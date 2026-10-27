import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("./drive", () => ({
  findOrCreatePhotoFolder: vi.fn(),
  uploadPhoto: vi.fn(),
  downloadPhoto: vi.fn(),
  trashDriveFile: vi.fn(),
}));

import type { PhotoRecord } from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { findOrCreatePhotoFolder, trashDriveFile, uploadPhoto } from "./drive";
import { syncPhotoFiles } from "./file-sync";
import { writePhotoSyncEnabled } from "./photo-sync-setting";

const TOKEN = "tok";

function record(id: string, photoIds: string[]): PhotoRecord {
  return {
    id,
    date: "2026-10-20",
    recordedAt: "2026-10-20T09:00:00+09:00",
    note: "",
    photoIds,
    updatedAt: "2026-10-20T09:00:00+09:00",
  };
}

async function seedRecord(id: string, photoIds: string[], withBlob = true) {
  await appDb.photoRecords.put(record(id, photoIds));
  await appDb.photoBlobs.bulkPut(
    photoIds.map((photoId) => ({
      id: photoId,
      recordId: id,
      blob: withBlob ? new Blob([photoId]) : null,
      width: 1,
      height: 1,
    })),
  );
}

beforeEach(async () => {
  await Promise.all([
    appDb.photoRecords.clear(),
    appDb.photoBlobs.clear(),
    appDb.photoFiles.clear(),
    appDb.photoTrash.clear(),
    appDb.tombstones.clear(),
  ]);
  window.localStorage.clear();
  vi.mocked(findOrCreatePhotoFolder).mockReset().mockResolvedValue("folder-1");
  vi.mocked(uploadPhoto).mockReset().mockImplementation(async (_t, _f, photoId) => `drive-${photoId}`);
  vi.mocked(trashDriveFile).mockReset().mockResolvedValue("ok");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncPhotoFiles", () => {
  it("uploads blobs without a photoFiles row when sync is on, then adds the rows", async () => {
    await seedRecord("r1", ["p1", "p2"]);
    await seedRecord("r2", ["p3"]);
    await appDb.photoFiles.put({ id: "p2", recordId: "r1", driveFileId: "drive-old", updatedAt: "2026-10-20T09:00:00+09:00" });
    // A photo known only from the sheet (blob not fetched yet) is never uploaded.
    await seedRecord("r3", ["p4"], false);

    const result = await syncPhotoFiles(TOKEN);

    expect(result).toEqual({ tableName: "PhotoDrive", rowCount: 2 });
    expect(findOrCreatePhotoFolder).toHaveBeenCalledWith(TOKEN);
    const uploaded = vi.mocked(uploadPhoto).mock.calls.map((c) => [c[0], c[1], c[2]]);
    expect(uploaded.sort()).toEqual([
      [TOKEN, "folder-1", "p1"],
      [TOKEN, "folder-1", "p3"],
    ]);
    // The stored blob is passed on (fake-indexeddb's clone drops jsdom's Blob class).
    expect(vi.mocked(uploadPhoto).mock.calls[0][3]).toBeTruthy();
    const files = await appDb.photoFiles.orderBy("id").toArray();
    expect(files.map(({ id, recordId, driveFileId }) => ({ id, recordId, driveFileId }))).toEqual([
      { id: "p1", recordId: "r1", driveFileId: "drive-p1" },
      { id: "p2", recordId: "r1", driveFileId: "drive-old" },
      { id: "p3", recordId: "r2", driveFileId: "drive-p3" },
    ]);
    expect(Number.isNaN(Date.parse(files[0].updatedAt))).toBe(false);
  });

  it("does not look up the folder when nothing needs uploading", async () => {
    const result = await syncPhotoFiles(TOKEN);
    expect(result).toEqual({ tableName: "PhotoDrive", rowCount: 0 });
    expect(findOrCreatePhotoFolder).not.toHaveBeenCalled();
  });

  it("skips uploads when sync is off but still empties the trash queue", async () => {
    writePhotoSyncEnabled(false);
    await seedRecord("r1", ["p1"]);
    await appDb.photoTrash.bulkPut([
      { driveFileId: "d1", queuedAt: "2026-10-20T09:00:00+09:00" },
      { driveFileId: "d2", queuedAt: "2026-10-20T09:00:00+09:00" },
    ]);

    const result = await syncPhotoFiles(TOKEN);

    expect(result).toEqual({ tableName: "PhotoDrive", rowCount: 0 });
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(findOrCreatePhotoFolder).not.toHaveBeenCalled();
    expect(vi.mocked(trashDriveFile).mock.calls.map((c) => c[1]).sort()).toEqual(["d1", "d2"]);
    expect(await appDb.photoTrash.count()).toBe(0);
    expect(await appDb.photoFiles.count()).toBe(0);
  });

  it("keeps a trash item whose call failed and removes the ones that succeeded", async () => {
    await appDb.photoTrash.bulkPut([
      { driveFileId: "d1", queuedAt: "2026-10-20T09:00:00+09:00" },
      { driveFileId: "d2", queuedAt: "2026-10-20T09:00:00+09:00" },
      { driveFileId: "d3", queuedAt: "2026-10-20T09:00:00+09:00" },
    ]);
    vi.mocked(trashDriveFile).mockImplementation(async (_t, id) => (id === "d2" ? "failed" : "ok"));

    const result = await syncPhotoFiles(TOKEN);

    expect(result.error).toBeDefined();
    expect((await appDb.photoTrash.toArray()).map((t) => t.driveFileId)).toEqual(["d2"]);
  });

  it("does not upload a photo removed while the queue is processed (removed photos have no blob)", async () => {
    await seedRecord("r1", ["p1", "p2"]);
    await appDb.photoTrash.put({ driveFileId: "d-old", queuedAt: "2026-10-20T09:00:00+09:00" });
    vi.mocked(trashDriveFile).mockImplementation(async () => {
      // The user removes p2 from the record while the trash queue is being processed.
      await appDb.photoBlobs.delete("p2");
      await appDb.photoRecords.put(record("r1", ["p1"]));
      return "ok";
    });

    const result = await syncPhotoFiles(TOKEN);

    expect(result.rowCount).toBe(1);
    expect(vi.mocked(uploadPhoto).mock.calls.map((c) => c[2])).toEqual(["p1"]);
    expect((await appDb.photoFiles.toArray()).map((f) => f.id)).toEqual(["p1"]);
  });

  it("queues the uploaded file for the trash when the photo is removed during its upload", async () => {
    await seedRecord("r1", ["p1"]);
    vi.mocked(uploadPhoto).mockImplementation(async () => {
      await appDb.photoBlobs.delete("p1");
      return "drive-p1";
    });

    const result = await syncPhotoFiles(TOKEN);

    expect(result.rowCount).toBe(0);
    expect(await appDb.photoFiles.count()).toBe(0);
    expect((await appDb.photoTrash.toArray()).map((t) => t.driveFileId)).toEqual(["drive-p1"]);
  });

  it("a failed upload is reported and the other photos are still uploaded", async () => {
    await seedRecord("r1", ["p1", "p2", "p3"]);
    vi.mocked(uploadPhoto).mockImplementation(async (_t, _f, photoId) => {
      if (photoId === "p2") throw new Error("upload p2 failed");
      return `drive-${photoId}`;
    });

    const result = await syncPhotoFiles(TOKEN);

    expect(result.rowCount).toBe(2);
    expect(result.error).toBe("upload p2 failed");
    expect((await appDb.photoFiles.orderBy("id").primaryKeys())).toEqual(["p1", "p3"]);
  });

  it("reports a folder failure without throwing", async () => {
    await seedRecord("r1", ["p1"]);
    vi.mocked(findOrCreatePhotoFolder).mockRejectedValue(new Error("no folder"));

    const result = await syncPhotoFiles(TOKEN);

    expect(result).toEqual({ tableName: "PhotoDrive", rowCount: 0, error: "no folder" });
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it("cleans up blobs and file rows whose record no longer exists", async () => {
    await seedRecord("r1", ["p1"]);
    await appDb.photoFiles.put({ id: "p1", recordId: "r1", driveFileId: "d1", updatedAt: "2026-10-20T09:00:00+09:00" });
    // r2 was deleted on another device: its record is gone, its blob and file row remain.
    await appDb.photoBlobs.put({ id: "p9", recordId: "r2", blob: new Blob(["x"]), width: 1, height: 1 });
    await appDb.photoFiles.put({ id: "p9", recordId: "r2", driveFileId: "d9", updatedAt: "2026-10-20T09:00:00+09:00" });

    const result = await syncPhotoFiles(TOKEN);

    expect(result.error).toBeUndefined();
    expect(await appDb.photoBlobs.toCollection().primaryKeys()).toEqual(["p1"]);
    expect(await appDb.photoFiles.toCollection().primaryKeys()).toEqual(["p1"]);
    // The deleting device trashes the Drive file; this one neither uploads nor trashes it.
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(trashDriveFile).not.toHaveBeenCalled();
  });

  it("drops a blob its record no longer lists (removed in an edit on another device) instead of uploading it", async () => {
    await seedRecord("r1", ["p1", "p2"]);
    // The merged record no longer lists p2; its file row was removed by the PhotoFiles tombstone.
    await appDb.photoRecords.put(record("r1", ["p1"]));

    const result = await syncPhotoFiles(TOKEN);

    expect(result.rowCount).toBe(1);
    expect(vi.mocked(uploadPhoto).mock.calls.map((c) => c[2])).toEqual(["p1"]);
    expect(await appDb.photoBlobs.toCollection().primaryKeys()).toEqual(["p1"]);
  });
});
