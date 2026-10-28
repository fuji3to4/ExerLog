import type { BodySite, CellulitisCare, SymptomEntry, SymptomId, SymptomSeverity } from "@/lib/types";

import { cell } from "@/features/sync/sync-helpers";

export const SYMPTOMS: readonly SymptomId[] = [
  "edema",
  "pain",
  "heaviness",
  "fatigue",
  "stiffness",
  "pitting",
  "skin",
  "cellulitis",
];
export const BODY_SITES: readonly BodySite[] = ["armRight", "armLeft", "legRight", "legLeft", "other"];

const CARES: readonly CellulitisCare[] = ["inpatient", "outpatient", "none"];

/** Fatigue is whole-body, so it has no site. */
export function hasSites(id: SymptomId): boolean {
  return id !== "fatigue";
}

/** Cellulitis is recorded with a care level instead of a severity. */
export function hasSeverity(id: SymptomId): boolean {
  return id !== "cellulitis";
}

export const SYMPTOM_COLUMNS: string[] = [
  ...SYMPTOMS.flatMap((id) => [
    id,
    ...(hasSeverity(id) ? [`${id}_severity`] : []),
    ...(hasSites(id) ? [`${id}_sites`] : []),
  ]),
  "cellulitis_care",
];

/** Cells in SYMPTOM_COLUMNS order. */
export function symptomCells(symptoms: SymptomEntry[]): string[] {
  const byId = new Map(symptoms.map((s) => [s.id, s]));
  const cells: string[] = [];
  for (const id of SYMPTOMS) {
    const entry = byId.get(id);
    cells.push(entry ? "1" : "");
    if (hasSeverity(id)) cells.push(entry?.severity == null ? "" : String(entry.severity));
    if (hasSites(id)) cells.push(entry ? BODY_SITES.filter((s) => entry.sites.includes(s)).join("|") : "");
  }
  cells.push(byId.get("cellulitis")?.care ?? "");
  return cells;
}

export function parseSymptomCells(row: string[], headers: string[]): SymptomEntry[] {
  const entries: SymptomEntry[] = [];
  for (const id of SYMPTOMS) {
    if (cell(row, headers, id) !== "1") continue;
    const severity = Number(cell(row, headers, `${id}_severity`));
    const sites = cell(row, headers, `${id}_sites`).split("|");
    const care = cell(row, headers, "cellulitis_care") as CellulitisCare;
    entries.push({
      id,
      severity: hasSeverity(id) && [1, 2, 3].includes(severity) ? (severity as SymptomSeverity) : null,
      sites: hasSites(id) ? BODY_SITES.filter((s) => sites.includes(s)) : [],
      care: id === "cellulitis" && CARES.includes(care) ? care : null,
    });
  }
  return entries;
}
