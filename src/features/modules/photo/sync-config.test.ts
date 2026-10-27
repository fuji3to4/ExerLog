import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import type { PhotoFile, PhotoRecord } from "@/lib/types";
import { photoFilesSyncConfig, photosSyncConfig } from "./sync-config";

const record: PhotoRecord = {
  id: "r1",
  date: "2026-10-20",
  recordedAt: "2026-10-20T09:00:00+09:00",
  note: "a, \"b\"",
  photoIds: ["p1", "p2"],
  updatedAt: "2026-10-20T09:01:00+09:00",
};

describe("photo sync configs", () => {
  it("describes the Photos and PhotoFiles tabs", () => {
    expect(photosSyncConfig).toMatchObject({
      tabName: "Photos",
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletable: true,
      headers: ["id", "date", "recordedAt", "note", "photoIds", "updatedAt"],
    });
    expect(photoFilesSyncConfig).toMatchObject({
      tabName: "PhotoFiles",
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletable: true,
      headers: ["id", "recordId", "driveFileId", "updatedAt"],
    });
  });

  it("round-trips a photo record with photoIds as a JSON array cell", () => {
    const headers = photosSyncConfig.headers;
    const row = photosSyncConfig.toRow(record, headers);
    expect(row).toEqual([
      "r1",
      "2026-10-20",
      "2026-10-20T09:00:00+09:00",
      "a, \"b\"",
      '["p1","p2"]',
      "2026-10-20T09:01:00+09:00",
    ]);
    expect(photosSyncConfig.fromRow(row, headers)).toEqual(record);
  });

  it("reads an empty or malformed photoIds cell as []", () => {
    const headers = photosSyncConfig.headers;
    for (const cell of ["", "not json", "{}", "[1,2]", '"p1"']) {
      const row = photosSyncConfig.toRow(record, headers);
      row[headers.indexOf("photoIds")] = cell;
      expect(photosSyncConfig.fromRow(row, headers).photoIds).toEqual([]);
    }
    const mixed = photosSyncConfig.toRow(record, headers);
    mixed[headers.indexOf("photoIds")] = '["p1",3,"p2"]';
    expect(photosSyncConfig.fromRow(mixed, headers).photoIds).toEqual(["p1", "p2"]);
  });

  it("round-trips a PhotoFiles row", () => {
    const file: PhotoFile = { id: "p1", recordId: "r1", driveFileId: "d1", updatedAt: "2026-10-20T10:00:00+09:00" };
    const headers = photoFilesSyncConfig.headers;
    const row = photoFilesSyncConfig.toRow(file, headers);
    expect(row).toEqual(["p1", "r1", "d1", "2026-10-20T10:00:00+09:00"]);
    expect(photoFilesSyncConfig.fromRow(row, headers)).toEqual(file);
  });
});
