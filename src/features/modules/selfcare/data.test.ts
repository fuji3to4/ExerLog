import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import {
  addSelfCareRecord,
  deleteSelfCareRecord,
  listSelfCareInRange,
  selfCareData,
  updateSelfCareRecord,
} from "./data";

beforeEach(async () => {
  await Promise.all([appDb.selfCareRecords.clear(), appDb.tombstones.clear()]);
});

describe("selfcare data", () => {
  it("adds, updates and deletes with a tombstone", async () => {
    const rec = await addSelfCareRecord({
      date: "2026-10-05",
      recordedAt: "2026-10-05T10:00:00+09:00",
      item: "exercise",
      minutes: 30,
      note: "  walk ",
    });
    expect(rec.note).toBe("walk");
    expect(await appDb.selfCareRecords.count()).toBe(1);

    await updateSelfCareRecord({ ...rec, minutes: 40 });
    expect((await appDb.selfCareRecords.get(rec.id))?.minutes).toBe(40);

    await deleteSelfCareRecord(rec.id);
    expect(await appDb.selfCareRecords.count()).toBe(0);
    const tombs = await appDb.tombstones.toArray();
    expect(tombs.some((t) => t.table === "SelfCare" && t.id.endsWith(rec.id))).toBe(true);
  });

  it("lists in range inclusively, oldest first", async () => {
    await addSelfCareRecord({ date: "2026-10-02", recordedAt: "2026-10-02T09:00:00+09:00", item: "other", minutes: null, note: "" });
    await addSelfCareRecord({ date: "2026-10-01", recordedAt: "2026-10-01T09:00:00+09:00", item: "other", minutes: null, note: "" });
    await addSelfCareRecord({ date: "2026-10-03", recordedAt: "2026-10-03T09:00:00+09:00", item: "other", minutes: null, note: "" });
    const list = await listSelfCareInRange("2026-10-01", "2026-10-02");
    expect(list.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("listInPeriod drops out-of-range instants on boundary days", async () => {
    await addSelfCareRecord({ date: "2026-10-01", recordedAt: "2026-10-01T08:00:00+09:00", item: "skincare", minutes: null, note: "" });
    const inside = await addSelfCareRecord({ date: "2026-10-01", recordedAt: "2026-10-01T10:00:00+09:00", item: "skincare", minutes: null, note: "" });
    const list = await selfCareData.listInPeriod({ start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" });
    expect(list.map((r) => r.id)).toEqual([inside.id]);
  });

  it("round-trips through toRow/fromRow including null minutes", () => {
    const cfg = selfCareData.syncConfigs[0];
    expect(cfg.tabName).toBe("SelfCare");
    for (const minutes of [null, 15]) {
      const rec = {
        id: "a",
        date: "2026-10-05",
        recordedAt: "2026-10-05T10:00:00+09:00",
        item: "exercise" as const,
        minutes,
        note: "n",
        updatedAt: "2026-10-05T10:00:00+09:00",
      };
      expect(cfg.fromRow(cfg.toRow(rec, cfg.headers), cfg.headers)).toEqual(rec);
    }
  });

  it("CSV header row", async () => {
    const csv = await selfCareData.csv!.generate();
    expect(csv.split(/\r?\n/)[0].replace(/^﻿/, "")).toBe("date,recordedAt,item,minutes,note");
  });
});
