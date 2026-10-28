import type { WellnessEntry } from "@/lib/types";

export type ScoreStats = { average: number; min: number; max: number };

function stats(scores: number[]): ScoreStats {
  const sum = scores.reduce((total, score) => total + score, 0);
  return {
    average: Math.round((sum / scores.length) * 10) / 10,
    min: Math.min(...scores),
    max: Math.max(...scores),
  };
}

export function summarizeWellness(
  entries: WellnessEntry[],
): { count: number; physical: ScoreStats; mental: ScoreStats } | null {
  if (entries.length === 0) return null;
  return {
    count: entries.length,
    physical: stats(entries.map((entry) => entry.physicalScore)),
    mental: stats(entries.map((entry) => entry.mentalScore)),
  };
}
