import { describe, expect, it } from "vitest";

import type { MeasurementRecord } from "@/lib/types";
import { summarizeBody } from "./summary";

function rec(day: string, values: Record<string, number>): MeasurementRecord {
  return {
    id: day,
    date: `2026-10-${day}`,
    recordedAt: `2026-10-${day}T08:00:00+09:00`,
    values,
    note: "",
    updatedAt: `2026-10-${day}T08:00:00+09:00`,
  };
}

describe("summarizeBody", () => {
  const records = [rec("20", { weight: 60.2 }), rec("02", { weight: 61.0, bodyFat: 22 }), rec("10", { bodyFat: 21 })];

  it("uses first/last by time and BMI from the given height", () => {
    const s = summarizeBody(records, 160)!;
    expect(s.count).toBe(3);
    expect(s.weight).toMatchObject({ first: 61, last: 60.2, min: 60.2, max: 61 });
    expect(s.weight!.diff).toBeCloseTo(-0.8, 5);
    expect(s.bodyFat).toMatchObject({ first: 22, last: 21, min: 21, max: 22 });
    expect(s.bmi).toBe(23.5);
  });

  it("omits BMI without height", () => {
    expect(summarizeBody(records, null)!.bmi).toBeNull();
  });

  it("returns null for no records and null metrics that were never recorded", () => {
    expect(summarizeBody([], 160)).toBeNull();
    const s = summarizeBody([rec("02", { height: 160 })], null)!;
    expect(s.weight).toBeNull();
    expect(s.bodyFat).toBeNull();
    expect(s.bmi).toBeNull();
  });
});
