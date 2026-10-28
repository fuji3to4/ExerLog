import type { WellnessScore } from "@/lib/types";

import { getLatestWellnessEntry } from "./data";

export type ConditionScores = { physicalScore: WellnessScore; mentalScore: WellnessScore };

/**
 * The only entry point through which the exercise feature reads the wellness module.
 * Returns the day's latest scores, or null when there is none.
 */
export async function getLatestConditionScores(dayKey: string): Promise<ConditionScores | null> {
  const latest = await getLatestWellnessEntry(dayKey);
  return latest ? { physicalScore: latest.physicalScore, mentalScore: latest.mentalScore } : null;
}
