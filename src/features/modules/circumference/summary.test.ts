import { describe, expect, it } from "vitest";

import type { MeasurementRecord } from "@/lib/types";
import { summarizeCircumference } from "./summary";

function rec(id: string, at: string, values: Record<string, number>): MeasurementRecord {
  return { id, date: at.slice(0, 10), recordedAt: at, values, note: "", updatedAt: at };
}

describe("summarizeCircumference", () => {
  it("skips unrecorded sites and pairs sides only within a record", () => {
    const s = summarizeCircumference([
      rec("b", "2026-10-20T08:00:00+09:00", { armWristLeft: 15.4, armWristRight: 16 }),
      rec("a", "2026-10-02T08:00:00+09:00", { armWristLeft: 15 }),
    ])!;
    expect(s.count).toBe(2);
    expect(s.sites).toHaveLength(1);
    const site = s.sites[0];
    expect(site).toMatchObject({ limb: "arm", site: "wrist" });
    expect(site.left).toMatchObject({ first: 15, last: 15.4 });
    expect(site.left!.diff).toBeCloseTo(0.4, 5);
    expect(site.right).toMatchObject({ first: 16, last: 16, diff: 0 });
    expect(site.sideDiffFirst).toBeCloseTo(0.6, 5);
    expect(site.sideDiffLast).toBeCloseTo(0.6, 5);
  });

  it("returns null for no records", () => {
    expect(summarizeCircumference([])).toBeNull();
  });

  it("has null side differences when no record has both sides", () => {
    const s = summarizeCircumference([rec("a", "2026-10-02T08:00:00+09:00", { legAnkleRight: 20 })])!;
    expect(s.sites[0]).toMatchObject({ limb: "leg", site: "ankle", left: null, sideDiffFirst: null, sideDiffLast: null });
  });
});
