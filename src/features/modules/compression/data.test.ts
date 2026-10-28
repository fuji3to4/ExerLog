import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import {
  addCompressionRecord,
  compressionData,
  deleteCompressionRecord,
  findOpenCompressionRecord,
} from "./data";

beforeEach(async () => {
  await Promise.all([appDb.compressionRecords.clear(), appDb.tombstones.clear()]);
});

describe("compression data", () => {
  it("derives date from the start time", async () => {
    const rec = await addCompressionRecord({
      kind: "garment",
      recordedAt: "2026-10-28T22:00:00+09:00",
      endedAt: null,
      note: " x ",
    });
    expect(rec.date).toBe("2026-10-28");
    expect(rec.note).toBe("x");
  });

  it("finds the newest open record of the kind", async () => {
    await addCompressionRecord({ kind: "garment", recordedAt: "2026-10-01T08:00:00+09:00", endedAt: null, note: "" });
    const newer = await addCompressionRecord({ kind: "garment", recordedAt: "2026-10-02T08:00:00+09:00", endedAt: null, note: "" });
    await addCompressionRecord({ kind: "garment", recordedAt: "2026-10-04T08:00:00+09:00", endedAt: "2026-10-04T18:00:00+09:00", note: "" });
    await addCompressionRecord({ kind: "bandage", recordedAt: "2026-10-03T08:00:00+09:00", endedAt: null, note: "" });
    expect((await findOpenCompressionRecord("garment"))?.id).toBe(newer.id);
    await appDb.compressionRecords.where("kind").equals("bandage").delete();
    expect(await findOpenCompressionRecord("bandage")).toBeUndefined();
  });

  it("delete leaves a tombstone", async () => {
    const rec = await addCompressionRecord({ kind: "garment", recordedAt: "2026-10-01T08:00:00+09:00", endedAt: null, note: "" });
    await deleteCompressionRecord(rec.id);
    expect(await appDb.compressionRecords.count()).toBe(0);
    const tombs = await appDb.tombstones.toArray();
    expect(tombs.some((t) => t.table === "Compression" && t.id.endsWith(rec.id))).toBe(true);
  });

  it("round-trips through toRow/fromRow including null endedAt", () => {
    const cfg = compressionData.syncConfigs[0];
    expect(cfg.tabName).toBe("Compression");
    for (const endedAt of [null, "2026-10-05T18:00:00+09:00"]) {
      const rec = {
        id: "a",
        date: "2026-10-05",
        recordedAt: "2026-10-05T08:00:00+09:00",
        kind: "bandage" as const,
        endedAt,
        note: "n",
        updatedAt: "2026-10-05T08:00:00+09:00",
      };
      expect(cfg.fromRow(cfg.toRow(rec, cfg.headers), cfg.headers)).toEqual(rec);
    }
  });

  it("CSV header row", async () => {
    const csv = await compressionData.csv!.generate();
    expect(csv.split(/\r?\n/)[0].replace(/^﻿/, "")).toBe("date,kind,startedAt,endedAt,minutes,note");
  });
});
