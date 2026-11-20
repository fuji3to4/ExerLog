import { describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import type { MeasurementRecord } from "@/lib/types";
import { CIRCUMFERENCE_ITEMS } from "./measurement-items";
import { createMeasurementRepository } from "./measurement-repository";
import { createMeasurementSyncConfig } from "./measurement-sync";

const FIXED = ["id", "date", "recordedAt", "note", "updatedAt"];

const circumferenceConfig = createMeasurementSyncConfig({
  tabName: "Circumference",
  items: CIRCUMFERENCE_ITEMS,
  repository: createMeasurementRepository(appDb.circumferenceRecords, "Circumference"),
});

function record(values: Record<string, number>): MeasurementRecord {
  return {
    id: "m-1",
    date: "2026-10-20",
    recordedAt: "2026-10-20T07:00:00+09:00",
    values,
    note: "朝, \"測定\"",
    updatedAt: "2026-10-20T07:00:00+09:00",
  };
}

describe("createMeasurementSyncConfig", () => {
  test("uses the given tab name and matches columns by name", () => {
    expect(circumferenceConfig.tabName).toBe("Circumference");
    expect(circumferenceConfig.headerMode).toBe("byName");
    expect(circumferenceConfig.headers).toEqual(FIXED);
    expect(circumferenceConfig.keyColumn).toBe("id");
    expect(circumferenceConfig.updatedAtKey).toBe("updatedAt");
    expect(circumferenceConfig.deletable).toBe(true);
  });

  test("circumference headers are the fixed columns, every circumference id in order, then unknown ids sorted", () => {
    const ids = CIRCUMFERENCE_ITEMS.map((item) => item.id);
    expect(circumferenceConfig.buildHeaders!([])).toEqual([...FIXED, ...ids]);
    expect(
      circumferenceConfig.buildHeaders!([record({ armWristLeft: 15, zeta: 1 }), record({ alpha: 2 })]),
    ).toEqual([...FIXED, ...ids, "alpha", "zeta"]);
  });

  test("toRow then fromRow round-trips the record", () => {
    const original = record({ armWristLeft: 15, legGroinRight: 53.4, extra: 3 });
    const headers = circumferenceConfig.buildHeaders!([original]);
    const row = circumferenceConfig.toRow(original, headers);
    expect(row.slice(0, 5)).toEqual([original.id, original.date, original.recordedAt, original.note, original.updatedAt]);
    expect(circumferenceConfig.fromRow(row, headers)).toEqual(original);
  });

  test("reads from and replaces its own table", async () => {
    await appDb.circumferenceRecords.clear();
    const circumference = record({ armWristLeft: 15 });
    await circumferenceConfig.replaceDb([circumference]);
    expect(await circumferenceConfig.readFromDb()).toEqual([circumference]);
  });
});
