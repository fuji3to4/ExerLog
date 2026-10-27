import type { MeasurementRecord } from "@/lib/types";

export type FirstLast = { first: number; last: number; diff: number; min: number; max: number };

function firstLast(sorted: MeasurementRecord[], itemId: string): FirstLast | null {
  const values = sorted.flatMap((record) => (itemId in record.values ? [record.values[itemId]] : []));
  if (values.length === 0) return null;
  const first = values[0];
  const last = values[values.length - 1];
  return { first, last, diff: last - first, min: Math.min(...values), max: Math.max(...values) };
}

/** Records may be in any order. `heightAtLastWeight` is the height valid at the last weight record. */
export function summarizeBody(
  records: MeasurementRecord[],
  heightAtLastWeight: number | null,
): { count: number; weight: FirstLast | null; bodyFat: FirstLast | null; bmi: number | null } | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const weight = firstLast(sorted, "weight");
  const bodyFat = firstLast(sorted, "bodyFat");
  const bmi =
    weight && heightAtLastWeight && heightAtLastWeight > 0
      ? Math.round((weight.last / (heightAtLastWeight / 100) ** 2) * 10) / 10
      : null;
  return { count: records.length, weight, bodyFat, bmi };
}
