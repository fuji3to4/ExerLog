"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTodaysRecommendations } from "@/features/recommendations/get-todays-recommendations";
import { getDailyCondition, saveDailyCondition } from "@/features/storage/daily-condition.repository";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { ConditionLevel, ExerciseLogResult, ExerciseVideo } from "@/lib/types";

type ExerciseLogState = Record<string, ExerciseLogResult | undefined>;

export function useTodayData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>("okay");
  const [note, setNote] = useState("");
  const [logResults, setLogResults] = useState<ExerciseLogState>({});
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const hasConditionDraft = useRef(false);
  const hasNoteDraft = useRef(false);

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  useEffect(() => {
    let isActive = true;
    hasConditionDraft.current = false;
    hasNoteDraft.current = false;

    async function loadTodayData() {
      const selectedDayKey = toDayKey(dayKey);
      const [savedCondition, savedLogs] = await Promise.all([
        getDailyCondition(selectedDayKey),
        listExerciseLogsForDay(selectedDayKey),
      ]);

      if (!isActive) {
        return;
      }

      if (!hasConditionDraft.current) {
        setConditionLevel(savedCondition?.conditionLevel ?? "okay");
      }

      if (!hasNoteDraft.current) {
        setNote(savedCondition?.note ?? "");
      }

      setLogResults(
        Object.fromEntries(savedLogs.map((entry) => [entry.exerciseId, entry.result])) as ExerciseLogState,
      );
      setHydratedDayKey(selectedDayKey);
    }

    void loadTodayData();

    return () => {
      isActive = false;
    };
  }, [dayKey]);

  const recommendations = useMemo(
    () =>
      getTodaysRecommendations({
        catalog: exercises,
        conditionLevel,
        date: dayKey,
      }),
    [exercises, conditionLevel, dayKey],
  );

  const saveConditionEntry = useCallback(async () => {
    const selectedDayKey = toDayKey(dayKey);

    await saveDailyCondition({
      date: selectedDayKey,
      conditionLevel,
      note,
    });
  }, [conditionLevel, dayKey, note]);

  const updateConditionLevel = useCallback((nextConditionLevel: ConditionLevel) => {
    hasConditionDraft.current = true;
    setConditionLevel(nextConditionLevel);
  }, []);

  const updateNote = useCallback((nextNote: string) => {
    hasNoteDraft.current = true;
    setNote(nextNote);
  }, []);

  const logExercise = useCallback(
    async (exerciseId: string, result: ExerciseLogResult) => {
      const selectedDayKey = toDayKey(dayKey);

      setLogResults((currentResults) => ({
        ...currentResults,
        [exerciseId]: result,
      }));

      await saveExerciseLog({
        date: selectedDayKey,
        exerciseId,
        result,
      });
    },
    [dayKey],
  );

  return {
    isHydrated: hydratedDayKey === dayKey,
    conditionLevel,
    note,
    recommendations,
    logResults,
    setConditionLevel: updateConditionLevel,
    setNote: updateNote,
    saveCondition: saveConditionEntry,
    logExercise,
  };
}
