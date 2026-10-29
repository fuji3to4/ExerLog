import { describe, expect, it } from "vitest";

import type { MeasurementRecord } from "@/lib/types";
import { summarizeGirth } from "./summary";

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

describe("summarizeGirth", () => {
  it("returns null for no records", () => {
    expect(summarizeGirth([])).toBeNull();
  });

  it("summarizes first/last/min/max per item", () => {
    const records = [rec("20", { chest: 91 }), rec("10", { chest: 92 }), rec("02", { chest: 90 })];
    const s = summarizeGirth(records)!;
    expect(s.count).toBe(3);
    expect(s.chest).toEqual({ first: 90, last: 91, diff: 1, min: 90, max: 92 });
    expect(s.waist).toBeNull();
  });

  it("summarizes when only one item was recorded", () => {
    const s = summarizeGirth([rec("02", { waist: 80.1 })])!;
    expect(s.chest).toBeNull();
    expect(s.waist).toMatchObject({ first: 80.1, last: 80.1, min: 80.1, max: 80.1 });
  });
});
