import type { CustomRecord } from "@/lib/types";
import type { CustomRecordDefinition } from "./definition";
import { coerceValue } from "./values";

export type CustomSummary = {
  count: number;
  /** number and scale fields; fields with no values are left out. */
  numeric: { fieldId: string; avg: number; min: number; max: number }[];
  /**
   * Defined options first (most frequent first, ties in definition order), then
   * ids no longer in the definition (most frequent first, ties by id).
   */
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
        .map((r) => coerceValue(field, r.values[field.id]))
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) continue;
      const sum = values.reduce((a, b) => a + b, 0);
      numeric.push({ fieldId: field.id, avg: sum / values.length, min: Math.min(...values), max: Math.max(...values) });
    } else if (field.type === "choice" || field.type === "multiChoice") {
      const order = new Map(field.options.map((o, index) => [o.id, index]));
      const tally = new Map<string, number>();
      for (const record of records) {
        const value = coerceValue(field, record.values[field.id]);
        const ids = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        for (const id of ids) tally.set(id, (tally.get(id) ?? 0) + 1);
      }
      const counts = [...tally]
        .map(([optionId, count]) => ({ optionId, count }))
        .sort((a, b) => {
          const aDefined = order.has(a.optionId);
          const bDefined = order.has(b.optionId);
          if (aDefined !== bDefined) return aDefined ? -1 : 1;
          if (a.count !== b.count) return b.count - a.count;
          if (aDefined) return (order.get(a.optionId) ?? 0) - (order.get(b.optionId) ?? 0);
          return a.optionId < b.optionId ? -1 : a.optionId > b.optionId ? 1 : 0;
        });
      if (counts.length > 0) choices.push({ fieldId: field.id, counts });
    }
  }
  return { count: records.length, numeric, choices };
}
