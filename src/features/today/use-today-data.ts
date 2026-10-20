"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTodaysRecommendations } from "@/features/recommendations/get-todays-recommendations";
import { mapWellnessToCondition } from "@/features/recommendations/wellness-to-condition";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog, countExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { getLatestWellnessEntry } from "@/features/storage/wellness-entries.repository";
import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import type { ExerciseLog, ExerciseLogResult, ExerciseVideo, WellnessScore } from "@/lib/types";

const DEFAULT_WELLNESS_SCORE: WellnessScore = 3;

type LatestScores = { physicalScore: WellnessScore; mentalScore: WellnessScore };

const DEFAULT_SCORES: LatestScores = {
  physicalScore: DEFAULT_WELLNESS_SCORE,
  mentalScore: DEFAULT_WELLNESS_SCORE,
};

async function loadLatestScores(dayKey: string): Promise<LatestScores> {
  const latest = await getLatestWellnessEntry(dayKey);
  return latest ? { physicalScore: latest.physicalScore, mentalScore: latest.mentalScore } : DEFAULT_SCORES;
}

export function useTodayData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [scores, setScores] = useState<LatestScores>(DEFAULT_SCORES);
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const dayKeyRef = useRef(dayKey);

  useEffect(() => {
    dayKeyRef.current = dayKey;
  }, [dayKey]);

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadTodayData() {
      const [latestScores, counts] = await Promise.all([
        loadLatestScores(dayKey),
        countExerciseLogsForDay(dayKey),
      ]);

      if (!isActive) {
        return;
      }

      setScores(latestScores);
      setLogCounts(counts);
      setHydratedDayKey(dayKey);
    }

    void loadTodayData();

    return () => {
      isActive = false;
    };
  }, [dayKey]);

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

  const refreshLatestWellness = useCallback(async () => {
    const requestedDayKey = dayKey;
    const latestScores = await loadLatestScores(requestedDayKey);
    if (dayKeyRef.current === requestedDayKey) {
      setScores(latestScores);
    }
  }, [dayKey]);

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
    refreshLatestWellness,
  };
}
