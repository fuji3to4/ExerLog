import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import {
  addPhotoRecord,
  deletePhotoRecord,
  getPhotoBlob,
  listAllPhotoRecords,
  listPhotoRecordsForDay,
  listPhotoRecordsInDayRange,
  storeFetchedBlob,
  updatePhotoRecord,
  type NewPhoto,
} from "./repository";

const photo = (text = "x"): NewPhoto => ({ blob: new Blob([text]), width: 10, height: 20 });

beforeEach(async () => {
  await Promise.all([
    appDb.photoRecords.clear(),
    appDb.photoBlobs.clear(),
    appDb.photoFiles.clear(),
    appDb.photoTrash.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("photo repository", () => {
  it("adds a record with photos in order and stores each blob", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: " hi ", photos: [photo("a"), photo("b")] });
    expect(record.photoIds).toHaveLength(2);
    expect(record.note).toBe("hi");
    const first = await getPhotoBlob(record.photoIds[0]);
    expect(first).toMatchObject({ recordId: record.id, width: 10, height: 20 });
    expect(first?.blob).not.toBeNull();
    expect(await appDb.photoBlobs.count()).toBe(2);
    expect((await listAllPhotoRecords())[0].id).toBe(record.id);
  });

  it("rejects 0 photos and more than 20 photos", async () => {
    await expect(addPhotoRecord({ date: "2026-10-20", note: "", photos: [] })).rejects.toThrow();
    await expect(
      addPhotoRecord({ date: "2026-10-20", note: "", photos: Array.from({ length: 21 }, () => photo()) }),
    ).rejects.toThrow();
    expect(await appDb.photoRecords.count()).toBe(0);
  });

  it("update keeps, reorders by keepPhotoIds, appends added, and removes the rest", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo(), photo(), photo()] });
    const [a, b, c] = record.photoIds;
    const updated = await updatePhotoRecord(record, {
      note: "n",
      recordedAt: record.recordedAt,
      keepPhotoIds: [c, a],
      added: [photo("new")],
    });
    expect(updated.photoIds.slice(0, 2)).toEqual([c, a]);
    expect(updated.photoIds).toHaveLength(3);
    expect(updated.note).toBe("n");
    expect(await getPhotoBlob(b)).toBeUndefined();
    expect(await getPhotoBlob(updated.photoIds[2])).toBeDefined();
    expect((await appDb.photoRecords.get(record.id))?.photoIds).toEqual(updated.photoIds);
    expect(await appDb.tombstones.get(`PhotoFiles:${b}`)).toBeDefined();
  });

  it("removing a photo with a drive file queues the file id for trash and tombstones PhotoFiles:<photoId>", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo(), photo()] });
    const [a, b] = record.photoIds;
    await appDb.photoFiles.put({ id: b, recordId: record.id, driveFileId: "drive-b", updatedAt: "2026-10-20T10:00:00+09:00" });
    await updatePhotoRecord(record, { note: "", recordedAt: record.recordedAt, keepPhotoIds: [a], added: [] });
    expect(await appDb.photoFiles.get(b)).toBeUndefined();
    expect((await appDb.photoTrash.toArray()).map((t) => t.driveFileId)).toEqual(["drive-b"]);
    expect(await appDb.tombstones.get(`PhotoFiles:${b}`)).toMatchObject({ table: "PhotoFiles", recordId: b });
  });

  it("deleting a record removes its blobs and files, tombstones Photos:<id>, and queues every known drive file", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo(), photo(), photo()] });
    const [a, b] = record.photoIds;
    await appDb.photoFiles.bulkPut([
      { id: a, recordId: record.id, driveFileId: "drive-a", updatedAt: "2026-10-20T10:00:00+09:00" },
      { id: b, recordId: record.id, driveFileId: "drive-b", updatedAt: "2026-10-20T10:00:00+09:00" },
    ]);
    await deletePhotoRecord(record.id);
    expect(await appDb.photoRecords.count()).toBe(0);
    expect(await appDb.photoBlobs.count()).toBe(0);
    expect(await appDb.photoFiles.count()).toBe(0);
    expect((await appDb.photoTrash.toArray()).map((t) => t.driveFileId).sort()).toEqual(["drive-a", "drive-b"]);
    expect(await appDb.tombstones.get(`Photos:${record.id}`)).toBeDefined();
    for (const id of record.photoIds) {
      expect(await appDb.tombstones.get(`PhotoFiles:${id}`)).toBeDefined();
    }
  });

  it("lists a day's records oldest first by instant across offsets", async () => {
    // 10:00+09:00 is 01:00Z, earlier than 05:00Z although it sorts after it as a string.
    const late = await addPhotoRecord({ date: "2026-10-20", recordedAt: "2026-10-20T05:00:00Z", note: "late", photos: [photo()] });
    const early = await addPhotoRecord({ date: "2026-10-20", recordedAt: "2026-10-20T10:00:00+09:00", note: "early", photos: [photo()] });
    const ids = (await listPhotoRecordsForDay("2026-10-20")).map((r) => r.id);
    expect(ids).toEqual([early.id, late.id]);
    expect((await listPhotoRecordsInDayRange("2026-10-19", "2026-10-21")).map((r) => r.id)).toEqual([early.id, late.id]);
    expect((await listAllPhotoRecords()).map((r) => r.id)).toEqual([early.id, late.id]);
  });

  it("update keeps a duplicated keepPhotoId once and ignores unknown ids", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo(), photo()] });
    const [a, b] = record.photoIds;
    const updated = await updatePhotoRecord(record, {
      note: "",
      recordedAt: record.recordedAt,
      keepPhotoIds: [a, a, "unknown"],
      added: [],
    });
    expect(updated.photoIds).toEqual([a]);
    expect(await getPhotoBlob(b)).toBeUndefined();
  });

  it("update rejects results of 0 or more than 20 photos and writes nothing", async () => {
    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo(), photo()] });
    await expect(
      updatePhotoRecord(record, { note: "x", recordedAt: record.recordedAt, keepPhotoIds: ["unknown"], added: [] }),
    ).rejects.toThrow();
    await expect(
      updatePhotoRecord(record, {
        note: "x",
        recordedAt: record.recordedAt,
        keepPhotoIds: record.photoIds,
        added: Array.from({ length: 19 }, () => photo()),
      }),
    ).rejects.toThrow();
    expect(await appDb.photoBlobs.count()).toBe(2);
    expect(await appDb.photoRecords.get(record.id)).toEqual(record);
    expect(await appDb.tombstones.count()).toBe(0);
  });

  it("storeFetchedBlob fills a placeholder blob of a photo that is still in a record", async () => {
    await appDb.photoRecords.add({
      id: "r1",
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      note: "",
      photoIds: ["p1"],
      updatedAt: "2026-10-20T08:00:00+09:00",
    });
    await appDb.photoBlobs.put({ id: "p1", recordId: "r1", blob: null, width: 0, height: 0 });
    await storeFetchedBlob("p1", "r1", new Blob(["z"]));
    expect((await getPhotoBlob("p1"))?.blob).not.toBeNull();
  });

  it("storeFetchedBlob does not recreate a blob when the record or the photo is gone", async () => {
    await storeFetchedBlob("p1", "missing", new Blob(["z"]));
    expect(await getPhotoBlob("p1")).toBeUndefined();

    const record = await addPhotoRecord({ date: "2026-10-20", note: "", photos: [photo("a")] });
    await storeFetchedBlob("other", record.id, new Blob(["z"]));
    expect(await getPhotoBlob("other")).toBeUndefined();
  });
});
