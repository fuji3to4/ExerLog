import type { BodySite, CellulitisCare, SymptomId, SymptomRecord, SymptomSeverity } from "@/lib/types";

import { BODY_SITES, SYMPTOMS } from "./columns";

export type SymptomsSummary = {
  recordedDays: number;
  /** Days whose every record has no symptoms. */
  noSymptomDays: number;
  symptoms: { id: SymptomId; days: number; maxSeverity: SymptomSeverity | null; sites: BodySite[] }[];
  cellulitis: { days: number; careDays: Record<CellulitisCare, number> } | null;
};

export function summarizeSymptoms(records: SymptomRecord[]): SymptomsSummary | null {
  if (records.length === 0) return null;

  const byDay = new Map<string, SymptomRecord[]>();
  for (const r of records) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  const days = [...byDay.values()];

  const symptoms: SymptomsSummary["symptoms"] = [];
  for (const id of SYMPTOMS) {
    const entries = days.map((day) => day.flatMap((r) => r.symptoms.filter((s) => s.id === id)));
    const dayCount = entries.filter((e) => e.length > 0).length;
    if (dayCount === 0) continue;
    const all = entries.flat();
    const severities = all.flatMap((s) => (s.severity === null ? [] : [s.severity]));
    symptoms.push({
      id,
      days: dayCount,
      maxSeverity: severities.length ? (Math.max(...severities) as SymptomSeverity) : null,
      sites: BODY_SITES.filter((site) => all.some((s) => s.sites.includes(site))),
    });
  }

  const careDays: Record<CellulitisCare, number> = { inpatient: 0, outpatient: 0, none: 0 };
  let cellulitisDays = 0;
  for (const day of days) {
    const entries = day.flatMap((r) => r.symptoms.filter((s) => s.id === "cellulitis"));
    if (entries.length === 0) continue;
    cellulitisDays += 1;
    for (const care of new Set(entries.flatMap((s) => (s.care ? [s.care] : [])))) careDays[care] += 1;
  }

  return {
    recordedDays: days.length,
    noSymptomDays: days.filter((day) => day.every((r) => r.symptoms.length === 0)).length,
    symptoms,
    cellulitis: cellulitisDays > 0 ? { days: cellulitisDays, careDays } : null,
  };
}
