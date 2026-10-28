import { describe, expect, it } from "vitest";

import type { SymptomEntry } from "@/lib/types";
import { parseSymptomCells, SYMPTOM_COLUMNS, symptomCells } from "./columns";

function roundTrip(symptoms: SymptomEntry[]): SymptomEntry[] {
  return parseSymptomCells(symptomCells(symptoms), SYMPTOM_COLUMNS);
}

describe("symptom columns", () => {
  it("round-trips a symptom with neither severity nor sites", () => {
    const symptoms: SymptomEntry[] = [{ id: "edema", severity: null, sites: [], care: null }];
    expect(roundTrip(symptoms)).toEqual(symptoms);
  });

  it("round-trips no symptoms", () => {
    expect(roundTrip([])).toEqual([]);
  });

  it("round-trips cellulitis with sites and care", () => {
    const symptoms: SymptomEntry[] = [{ id: "cellulitis", severity: null, sites: ["legRight"], care: "outpatient" }];
    expect(roundTrip(symptoms)).toEqual(symptoms);
  });

  it("round-trips severity and several sites", () => {
    const symptoms: SymptomEntry[] = [
      { id: "pain", severity: 2, sites: ["armRight", "legLeft"], care: null },
      { id: "fatigue", severity: 3, sites: [], care: null },
    ];
    expect(roundTrip(symptoms)).toEqual(symptoms);
  });

  it("drops unknown sites, care values and out-of-range severities", () => {
    const row = SYMPTOM_COLUMNS.map(() => "");
    const set = (column: string, value: string) => {
      row[SYMPTOM_COLUMNS.indexOf(column)] = value;
    };
    set("edema", "1");
    set("edema_sites", "armLeft|bogus");
    set("edema_severity", "9");
    set("cellulitis", "1");
    set("cellulitis_care", "bogus");
    expect(parseSymptomCells(row, SYMPTOM_COLUMNS)).toEqual([
      { id: "edema", severity: null, sites: ["armLeft"], care: null },
      { id: "cellulitis", severity: null, sites: [], care: null },
    ]);
  });

  it("has no columns for what a symptom does not have", () => {
    expect(SYMPTOM_COLUMNS).not.toContain("fatigue_sites");
    expect(SYMPTOM_COLUMNS).not.toContain("cellulitis_severity");
    expect(SYMPTOM_COLUMNS).toContain("cellulitis_sites");
    expect(SYMPTOM_COLUMNS[SYMPTOM_COLUMNS.length - 1]).toBe("cellulitis_care");
  });
});
