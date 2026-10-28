import { describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import type { MeasurementRecord } from "@/lib/types";
import { BODY_ITEMS, CIRCUMFERENCE_ITEMS } from "./measurement-items";
import { createMeasurementRepository } from "./measurement-repository";
import { createMeasurementSyncConfig } from "./measurement-sync";

const FIXED = ["id", "date", "recordedAt", "note", "updatedAt"];

const bodyConfig = createMeasurementSyncConfig({
  tabName: "BodyMeasurements",
  items: BODY_ITEMS,
  repository: createMeasurementRepository(appDb.bodyRecords, "BodyMeasurements"),
});
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
    expect(bodyConfig.tabName).toBe("BodyMeasurements");
    expect(circumferenceConfig.tabName).toBe("Circumference");
    expect(bodyConfig.headerMode).toBe("byName");
    expect(bodyConfig.headers).toEqual(FIXED);
    expect(bodyConfig.keyColumn).toBe("id");
    expect(bodyConfig.updatedAtKey).toBe("updatedAt");
    expect(bodyConfig.deletable).toBe(true);
  });

  test("body headers are the fixed columns, the body items, then unknown ids sorted", () => {
    expect(bodyConfig.buildHeaders!([])).toEqual([...FIXED, "weight", "bodyFat", "height"]);
    expect(bodyConfig.buildHeaders!([record({ weight: 60, zeta: 1 }), record({ alpha: 2 })])).toEqual([
      ...FIXED,
      "weight",
      "bodyFat",
      "height",
      "alpha",
      "zeta",
    ]);
  });

  test("circumference headers are the fixed columns then every circumference id in order", () => {
    expect(circumferenceConfig.buildHeaders!([])).toEqual([...FIXED, ...CIRCUMFERENCE_ITEMS.map((item) => item.id)]);
  });

  test("toRow then fromRow round-trips the record", () => {
    const original = record({ weight: 60.2, height: 170, extra: 3 });
    const headers = bodyConfig.buildHeaders!([original]);
    const row = bodyConfig.toRow(original, headers);
    expect(row.slice(0, 5)).toEqual([original.id, original.date, original.recordedAt, original.note, original.updatedAt]);
    expect(bodyConfig.fromRow(row, headers)).toEqual(original);

    const circumference = record({ armWristLeft: 15, legGroinRight: 53.4 });
    const circumferenceHeaders = circumferenceConfig.buildHeaders!([circumference]);
    expect(
      circumferenceConfig.fromRow(circumferenceConfig.toRow(circumference, circumferenceHeaders), circumferenceHeaders),
    ).toEqual(circumference);
  });

  test("reads from and replaces its own table", async () => {
    await Promise.all([appDb.bodyRecords.clear(), appDb.circumferenceRecords.clear()]);
    const body = record({ weight: 60 });
    await bodyConfig.replaceDb([body]);
    expect(await bodyConfig.readFromDb()).toEqual([body]);
    expect(await circumferenceConfig.readFromDb()).toEqual([]);
  });
});
