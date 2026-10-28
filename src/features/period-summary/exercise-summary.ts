import { isWithinPeriod, periodDayKeys, type Period } from "@/features/modules/period";
import { appDb } from "@/features/storage/app-db";
import type { ExerciseLog } from "@/lib/types";

/** Logs performed within the period, oldest first. */
export async function listExerciseLogsInPeriod(period: Period): Promise<ExerciseLog[]> {
  const { start, end } = periodDayKeys(period);
  const logs = await appDb.exerciseLogs.where("date").between(start, end, true, true).sortBy("performedAt");
  return logs.filter((log) => isWithinPeriod(log.performedAt, period));
}

/** `titles` maps exerciseId to title; an unknown id is shown as the id itself. */
export function summarizeExercise(
  logs: ExerciseLog[],
  titles: Map<string, string>,
): { count: number; totalSeconds: number; top: { title: string; count: number }[] } | null {
  if (logs.length === 0) return null;
  const counts = new Map<string, number>();
  let totalSeconds = 0;
  for (const log of logs) {
    totalSeconds += log.durationSeconds;
    const title = titles.get(log.exerciseId) ?? log.exerciseId;
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
    .slice(0, 3);
  return { count: logs.length, totalSeconds, top };
}
