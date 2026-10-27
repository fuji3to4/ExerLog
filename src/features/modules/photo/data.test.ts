import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import type { PhotoRecord } from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { generatePhotosCsv } from "./csv";
import { photoData } from "./data";
import { syncPhotoFiles } from "./file-sync";
import { addPhotoRecord } from "./repository";
import { photoFilesSyncConfig, photosSyncConfig } from "./sync-config";

const photo = () => ({ blob: new Blob(["x"]), width: 1, height: 1 });
const P = { start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" };

beforeEach(async () => {
  await Promise.all([
    appDb.photoRecords.clear(),
    appDb.photoBlobs.clear(),
    appDb.photoFiles.clear(),
    appDb.photoTrash.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("photoData", () => {
  it("wires the photo tabs, tables, file sync and CSV", () => {
    expect(photoData.id).toBe("photo");
    expect(photoData.syncConfigs).toEqual([photosSyncConfig, photoFilesSyncConfig]);
    expect(photoData.tables()).toEqual([appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash]);
    expect(photoData.syncFiles).toBe(syncPhotoFiles);
    expect(photoData.csv.fileName).toBe("photos.csv");
    expect(photoData.csv.exportLabelKey).toBe("settings_export_photos");
  });

  it("lists by day, by period and by month", async () => {
    await addPhotoRecord({ date: "2026-10-01", recordedAt: "2026-10-01T08:00:00+09:00", note: "", photos: [photo()] });
    const inside = await addPhotoRecord({
      date: "2026-10-01",
      recordedAt: "2026-10-01T10:00:00+09:00",
      note: "",
      photos: [photo()],
    });
    expect((await photoData.listForDay("2026-10-01")).length).toBe(2);
    expect((await photoData.listInPeriod(P)).map((r) => r.id)).toEqual([inside.id]);
    expect(await photoData.datesWithRecordsInMonth("2026-10")).toEqual(new Set(["2026-10-01"]));
    expect(await photoData.datesWithRecordsInMonth("2026-09")).toEqual(new Set());
    expect(await photoData.count()).toBe(2);
  });

  it("clearAll removes records, blobs and file rows, tombstones both tabs and queues Drive files", async () => {
    const a = await addPhotoRecord({ date: "2026-10-01", note: "", photos: [photo(), photo()] });
    await appDb.photoFiles.put({ id: a.photoIds[0], recordId: a.id, driveFileId: "d1", updatedAt: a.updatedAt });
    await appDb.photoTrash.put({ driveFileId: "d-earlier", queuedAt: a.updatedAt });

    await appDb.transaction("rw", [...photoData.tables(), appDb.tombstones], () => photoData.clearAll());

    expect(await appDb.photoRecords.count()).toBe(0);
    expect(await appDb.photoBlobs.count()).toBe(0);
    expect(await appDb.photoFiles.count()).toBe(0);
    expect((await appDb.photoTrash.orderBy("driveFileId").primaryKeys())).toEqual(["d-earlier", "d1"]);
    const tombstones = await appDb.tombstones.toArray();
    expect(tombstones.filter((t) => t.table === "Photos").map((t) => t.recordId)).toEqual([a.id]);
    expect(tombstones.filter((t) => t.table === "PhotoFiles").map((t) => t.recordId).sort()).toEqual(
      [...a.photoIds].sort(),
    );
  });

  it("generates the CSV oldest first", async () => {
    await addPhotoRecord({ date: "2026-10-02", recordedAt: "2026-10-02T08:00:00+09:00", note: "later", photos: [photo()] });
    await addPhotoRecord({
      date: "2026-10-01",
      recordedAt: "2026-10-01T08:00:00+09:00",
      note: "a, b",
      photos: [photo(), photo()],
    });
    const lines = (await photoData.csv.generate()).split("\n");
    expect(lines[0]).toBe("date,recordedAt,note,photoCount");
    expect(lines[1]).toMatch(/^2026-10-01,.+,"a, b",2$/);
    expect(lines[2]).toMatch(/^2026-10-02,.+,later,1$/);
  });
});

describe("generatePhotosCsv", () => {
  it("writes date, recordedAt, note, photoCount", () => {
    const record: PhotoRecord = {
      id: "r1",
      date: "2026-10-20",
      recordedAt: "",
      note: "n",
      photoIds: ["a", "b", "c"],
      updatedAt: "",
    };
    expect(generatePhotosCsv([record])).toBe("date,recordedAt,note,photoCount\n2026-10-20,,n,3");
  });
});
