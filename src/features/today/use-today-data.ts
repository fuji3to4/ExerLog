"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTodaysRecommendations } from "@/features/recommendations/get-todays-recommendations";
import { mapWellnessToCondition } from "@/features/recommendations/wellness-to-condition";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog, countExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { useModuleSettings } from "@/features/modules/use-module-settings";
import { getLatestConditionScores, type ConditionScores } from "@/features/modules/wellness/condition";
import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import type { ExerciseLog, ExerciseLogResult, ExerciseVideo, WellnessScore } from "@/lib/types";

const DEFAULT_WELLNESS_SCORE: WellnessScore = 3;

type LatestScores = ConditionScores;

const DEFAULT_SCORES: LatestScores = {
  physicalScore: DEFAULT_WELLNESS_SCORE,
  mentalScore: DEFAULT_WELLNESS_SCORE,
};

async function loadLatestScores(dayKey: string, wellnessEnabled: boolean): Promise<LatestScores> {
  if (!wellnessEnabled) {
    return DEFAULT_SCORES;
  }
  return (await getLatestConditionScores(dayKey)) ?? DEFAULT_SCORES;
}

export function useTodayData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const { settings } = useModuleSettings();
  const wellnessEnabled = !settings.disabled.includes("wellness");
  const [scores, setScores] = useState<LatestScores>(DEFAULT_SCORES);
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const dayKeyRef = useRef(dayKey);

  useEffect(() => {
    dayKeyRef.current = dayKey;
  }, [dayKey]);

  useEffect(() => {
    listAllExercises().then(setExercises).catch(console.error);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadTodayData() {
      const [latestScores, counts] = await Promise.all([
        loadLatestScores(dayKey, wellnessEnabled),
        countExerciseLogsForDay(dayKey),
      ]);

      if (!isActive) {
        return;
      }

      setScores(latestScores);
      setLogCounts(counts);
      setHydratedDayKey(dayKey);
    }

    loadTodayData().catch(console.error);

    return () => {
      isActive = false;
    };
  }, [dayKey, wellnessEnabled]);

  const conditionLevel = useMemo(() => mapWellnessToCondition(scores), [scores]);

  const recommendations = useMemo(
    () =>
      getTodaysRecommendations({
        catalog: exercises,
        conditionLevel,
        date: dayKey,
      }),
    [exercises, conditionLevel, dayKey],
  );

  /** Reloads the latest wellness scores and today's log counts (after timeline edits or deletes). */
  const refresh = useCallback(async () => {
    const requestedDayKey = dayKey;
    let latestScores: LatestScores;
    let counts: Record<string, number>;
    try {
      [latestScores, counts] = await Promise.all([
        loadLatestScores(requestedDayKey, wellnessEnabled),
        countExerciseLogsForDay(requestedDayKey),
      ]);
    } catch (err) {
      // Keep the current state; the next refresh or reload retries.
      console.error(err);
      return;
    }
    if (dayKeyRef.current === requestedDayKey) {
      setScores(latestScores);
      setLogCounts(counts);
    }
  }, [dayKey, wellnessEnabled]);

  const logExercise = useCallback(
    async (exercise: ExerciseVideo, result: ExerciseLogResult): Promise<ExerciseLog> => {
      const requestedDayKey = dayKey;
      const log = await addExerciseLog({
        date: requestedDayKey,
        exerciseId: exercise.id,
        result,
        durationSeconds: exercise.durationSeconds,
        performedAt: localIsoAt(requestedDayKey),
      });

      if (dayKeyRef.current === requestedDayKey) {
        setLogCounts((current) => ({ ...current, [exercise.id]: (current[exercise.id] ?? 0) + 1 }));
      }

      return log;
    },
    [dayKey],
  );

  return {
    isHydrated: hydratedDayKey === dayKey,
    recommendations,
    logCounts,
    logExercise,
    refresh,
  };
}
