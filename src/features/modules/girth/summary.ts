import type { MeasurementRecord } from "@/lib/types";
import { firstLast, type FirstLast } from "../body/summary";

/** Records may be in any order. */
export function summarizeGirth(
  records: MeasurementRecord[],
): { count: number; chest: FirstLast | null; waist: FirstLast | null } | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  return { count: records.length, chest: firstLast(sorted, "chest"), waist: firstLast(sorted, "waist") };
}
