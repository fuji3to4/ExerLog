import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import type { ExerciseLog } from "@/lib/types";

import type { GraphPoint } from "./components/metric-graph-view";
import { ALL_TIME_START, type DayRange } from "./range-presets";

export type ExerciseMeasure = "count" | "minutes";

export type ExerciseGraphData = {
  /** Most first, at most `TOP_EXERCISES` entries; ties keep title order. */
  perExercise: { title: string; value: number }[];
  /** One point per day of the range (0 on days without logs), oldest first. */
  daily: GraphPoint[];
};

export const TOP_EXERCISES = 10;

function logValue(log: ExerciseLog, measure: ExerciseMeasure): number {
  return measure === "count" ? 1 : log.durationSeconds / 60;
}

function* daysBetween(start: string, end: string): Generator<string> {
  const [year, month, day] = start.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  for (let key = toDayKey(cursor); key <= end; cursor.setDate(cursor.getDate() + 1), key = toDayKey(cursor)) {
    yield key;
  }
}

/**
 * `logs` are those within `range`; `titles` maps exerciseId to title (an unknown id shows as itself).
 * An open-ended range (全期間) starts its daily series at the first log instead of `range.start`.
 */
export function buildExerciseGraph(
  logs: ExerciseLog[],
  titles: Map<string, string>,
  range: DayRange,
  measure: ExerciseMeasure,
): ExerciseGraphData {
  if (logs.length === 0) return { perExercise: [], daily: [] };

  const byTitle = new Map<string, number>();
  const byDay = new Map<string, number>();
  let firstDay = range.end;
  for (const log of logs) {
    const value = logValue(log, measure);
    const title = titles.get(log.exerciseId) ?? log.exerciseId;
    byTitle.set(title, (byTitle.get(title) ?? 0) + value);
    byDay.set(log.date, (byDay.get(log.date) ?? 0) + value);
    if (log.date < firstDay) firstDay = log.date;
  }

  const perExercise = [...byTitle.entries()]
    .map(([title, value]) => ({ title, value }))
    .sort((a, b) => b.value - a.value || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
    .slice(0, TOP_EXERCISES);

  const start = range.start === ALL_TIME_START ? firstDay : range.start;
  const daily = [...daysBetween(start, range.end)].map((day) => ({
    at: localIsoAt(day, new Date(2000, 0, 1, 12)),
    value: byDay.get(day) ?? 0,
  }));

  return { perExercise, daily };
}
