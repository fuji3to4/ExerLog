import { describe, expect, it } from "vitest";

import type { WellnessEntry, WellnessScore } from "@/lib/types";
import { summarizeWellness } from "./summary";

function e(physical: number, mental: number): WellnessEntry {
  return {
    id: `${physical}-${mental}`,
    date: "2026-10-20",
    recordedAt: "2026-10-20T09:00:00+09:00",
    physicalScore: physical as WellnessScore,
    mentalScore: mental as WellnessScore,
    note: "",
    updatedAt: "2026-10-20T09:00:00+09:00",
  };
}

describe("summarizeWellness", () => {
  it("averages to one decimal and finds min/max", () => {
    expect(summarizeWellness([e(2, 4), e(3, 5), e(5, 3)])).toEqual({
      count: 3,
      physical: { average: 3.3, min: 2, max: 5 },
      mental: { average: 4, min: 3, max: 5 },
    });
    expect(summarizeWellness([])).toBeNull();
  });
});
