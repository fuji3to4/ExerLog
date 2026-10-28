import { describe, expect, it } from "vitest";

import type { SymptomEntry, SymptomRecord } from "@/lib/types";
import { localIsoAt } from "@/lib/date/local-iso";
import { summarizeSymptoms } from "./summary";

function rec(date: string, symptoms: SymptomEntry[]): SymptomRecord {
  return {
    id: `${date}-${Math.random()}`,
    date,
    recordedAt: localIsoAt(date, new Date(2026, 0, 1, 10, 0, 0)),
    symptoms,
    note: "",
    updatedAt: localIsoAt(date),
  };
}

const edema = (severity: 1 | 2 | 3, sites: SymptomEntry["sites"]): SymptomEntry => ({
  id: "edema",
  severity,
  sites,
  care: null,
});
const cellulitis = (care: SymptomEntry["care"]): SymptomEntry => ({ id: "cellulitis", severity: null, sites: [], care });

describe("summarizeSymptoms", () => {
  it("summarizes days, severity and sites", () => {
    const summary = summarizeSymptoms([
      rec("2026-10-01", [edema(1, ["armLeft"])]),
      rec("2026-10-01", [edema(3, ["armRight"])]),
      rec("2026-10-02", []),
      rec("2026-10-03", []),
      rec("2026-10-03", [edema(2, [])]),
    ]);
    expect(summary).toMatchObject({ recordedDays: 3, noSymptomDays: 1 });
    expect(summary?.symptoms).toEqual([{ id: "edema", days: 2, maxSeverity: 3, sites: ["armRight", "armLeft"] }]);
    expect(summary?.cellulitis).toBeNull();
  });

  it("counts cellulitis days and care days", () => {
    const summary = summarizeSymptoms([
      rec("2026-10-05", [cellulitis("outpatient")]),
      rec("2026-10-06", [cellulitis("inpatient")]),
      rec("2026-10-06", [cellulitis("outpatient")]),
    ]);
    expect(summary?.cellulitis).toEqual({ days: 2, careDays: { inpatient: 1, outpatient: 2, none: 0 } });
    expect(summary?.symptoms[0]).toMatchObject({ id: "cellulitis", days: 2, maxSeverity: null });
  });

  it("returns null without records", () => {
    expect(summarizeSymptoms([])).toBeNull();
  });
});
