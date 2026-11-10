import type { CustomRecord } from "@/lib/types";
import type { CustomRecordDefinition } from "./definition";

export type CustomSummary = {
  count: number;
  /** number and scale fields; fields with no values are left out. */
  numeric: { fieldId: string; avg: number; min: number; max: number }[];
  /** Most frequent first, ties in definition order. */
  choices: { fieldId: string; counts: { optionId: string; count: number }[] }[];
};

export function summarizeCustomRecords(
  definition: CustomRecordDefinition,
  records: CustomRecord[],
): CustomSummary | null {
  if (records.length === 0) return null;
  const numeric: CustomSummary["numeric"] = [];
  const choices: CustomSummary["choices"] = [];
  for (const field of definition.fields) {
    if (field.type === "number" || field.type === "scale") {
      const values = records
        .map((r) => r.values[field.id])
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) continue;
      const sum = values.reduce((a, b) => a + b, 0);
      numeric.push({ fieldId: field.id, avg: sum / values.length, min: Math.min(...values), max: Math.max(...values) });
    } else if (field.type === "choice" || field.type === "multiChoice") {
      const tally = new Map(field.options.map((o) => [o.id, 0]));
      for (const record of records) {
        const value = record.values[field.id];
        const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        for (const id of ids) if (tally.has(id)) tally.set(id, (tally.get(id) ?? 0) + 1);
      }
      // Array.prototype.sort is stable, so ties keep the definition order.
      const counts = [...tally]
        .filter(([, count]) => count > 0)
        .map(([optionId, count]) => ({ optionId, count }))
        .sort((a, b) => b.count - a.count);
      if (counts.length > 0) choices.push({ fieldId: field.id, counts });
    }
  }
  return { count: records.length, numeric, choices };
}
