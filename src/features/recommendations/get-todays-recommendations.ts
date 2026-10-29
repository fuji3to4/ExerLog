import { toDayKey } from "@/lib/date/day-key";
import type { ConditionLevel, ExerciseLog, ExerciseVideo, WatchEvent } from "@/lib/types";

/** Why an exercise was picked; null when it only tops up an unfillable slot. */
export type RecommendationSlot = "usual" | "new" | "revisit" | "change" | null;

export type Recommendation = {
  exercise: ExerciseVideo;
  slot: RecommendationSlot;
};

/** Watches and logs on any day; only those before the recommended day are used. */
export type RecommendationHistory = {
  watches: Pick<WatchEvent, "exerciseId" | "date">[];
  logs: Pick<ExerciseLog, "exerciseId" | "date" | "performedAt">[];
};

type GetTodaysRecommendationsOptions = {
  catalog: ExerciseVideo[];
  conditionLevel: ConditionLevel;
  date: Date | string;
  history: RecommendationHistory;
  /** How many times the day's set was reshuffled; each reshuffle avoids the previous set. */
  reshuffle: number;
};

const RECOMMENDATION_COUNT = 3;
const USUAL_WINDOW_DAYS = 30;
const USUAL_TOP_COUNT = 3;

function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function rotate<T>(items: T[], seed: string): T[] {
  if (items.length === 0) {
    return items;
  }
  const offset = hashString(seed) % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function daysBefore(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return toDayKey(new Date(year, month - 1, day - days));
}

function pickSet(
  catalog: ExerciseVideo[],
  eligible: ExerciseVideo[],
  dayKey: string,
  history: RecommendationHistory,
  reshuffle: number,
  avoid: Set<string>,
): Recommendation[] {
  // History is limited to days before `dayKey`, so the day's set stays put while the user watches and logs.
  const watches = history.watches.filter((watch) => watch.date < dayKey);
  const logs = history.logs.filter((log) => log.date < dayKey);
  const seed = `${dayKey}#${reshuffle}`;
  const picked: Recommendation[] = [];
  const isFree = (exercise: ExerciseVideo) =>
    !avoid.has(exercise.id) && !picked.some((item) => item.exercise.id === exercise.id);

  function take(candidates: ExerciseVideo[], slot: RecommendationSlot | ((exercise: ExerciseVideo) => RecommendationSlot)) {
    const exercise = candidates.find(isFree);
    if (exercise) {
      picked.push({ exercise, slot: typeof slot === "function" ? slot(exercise) : slot });
    }
  }

  // Usual: one of the most watched over the last 30 days.
  const windowStart = daysBefore(dayKey, USUAL_WINDOW_DAYS);
  const watchCounts = new Map<string, number>();
  for (const watch of watches) {
    if (watch.date >= windowStart) {
      watchCounts.set(watch.exerciseId, (watchCounts.get(watch.exerciseId) ?? 0) + 1);
    }
  }
  const mostWatched = eligible
    .filter((exercise) => watchCounts.has(exercise.id))
    .sort((a, b) => (watchCounts.get(b.id) ?? 0) - (watchCounts.get(a.id) ?? 0))
    .filter(isFree)
    .slice(0, USUAL_TOP_COUNT);
  take(rotate(mostWatched, `${seed}:usual`), "usual");

  // Fresh: never watched or logged, otherwise the one untouched the longest.
  const lastTouched = new Map<string, string>();
  for (const { exerciseId, date } of [...watches, ...logs]) {
    if ((lastTouched.get(exerciseId) ?? "") < date) {
      lastTouched.set(exerciseId, date);
    }
  }
  const untouched = eligible.filter((exercise) => !lastTouched.has(exercise.id));
  const longestUntouched = eligible
    .filter((exercise) => lastTouched.has(exercise.id))
    .sort((a, b) => (lastTouched.get(a.id) ?? "").localeCompare(lastTouched.get(b.id) ?? ""));
  take([...rotate(untouched, `${seed}:new`), ...longestUntouched], (exercise) =>
    lastTouched.has(exercise.id) ? "revisit" : "new",
  );

  // Change of pace: a different body area from the last logged exercise.
  const lastLog = logs.reduce<(typeof logs)[number] | null>(
    (latest, log) => (latest === null || log.performedAt > latest.performedAt ? log : latest),
    null,
  );
  const lastBodyArea = catalog.find((exercise) => exercise.id === lastLog?.exerciseId)?.bodyArea;
  if (lastBodyArea) {
    take(
      rotate(eligible.filter((exercise) => exercise.bodyArea !== lastBodyArea), `${seed}:change`),
      "change",
    );
  }

  // Top up empty slots, reaching back into the avoided set only when nothing else is left.
  const fillers = rotate(eligible, `${seed}:fill`);
  for (const exercise of [...fillers.filter((item) => !avoid.has(item.id)), ...fillers]) {
    if (picked.length >= RECOMMENDATION_COUNT) {
      break;
    }
    if (!picked.some((item) => item.exercise.id === exercise.id)) {
      picked.push({ exercise, slot: null });
    }
  }

  return picked;
}

export function getTodaysRecommendations({
  catalog,
  conditionLevel,
  date,
  history,
  reshuffle,
}: GetTodaysRecommendationsOptions): Recommendation[] {
  const dayKey = toDayKey(date);
  const eligible =
    conditionLevel === "tired" ? catalog.filter((item) => item.intensity !== "high") : catalog;

  let avoid = new Set<string>();
  let result: Recommendation[] = [];
  for (let round = 0; round <= reshuffle; round += 1) {
    result = pickSet(catalog, eligible, dayKey, history, round, avoid);
    avoid = new Set(result.map((item) => item.exercise.id));
  }
  return result;
}
