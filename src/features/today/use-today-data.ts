"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTodaysRecommendations } from "@/features/recommendations/get-todays-recommendations";
import { mapWellnessToCondition } from "@/features/recommendations/wellness-to-condition";
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { deleteExerciseLogByDateAndExercise, listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { ExerciseLogResult, ExerciseVideo, WellnessScore } from "@/lib/types";

type ExerciseLogState = Record<string, ExerciseLogResult | undefined>;
const DEFAULT_WELLNESS_SCORE: WellnessScore = 3;

export function useTodayData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [physicalScore, setPhysicalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [mentalScore, setMentalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [note, setNote] = useState("");
  const [logResults, setLogResults] = useState<ExerciseLogState>({});
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const hasWellnessDraft = useRef(false);
  const hasNoteDraft = useRef(false);

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  useEffect(() => {
    let isActive = true;
    hasWellnessDraft.current = false;
    hasNoteDraft.current = false;

    async function loadTodayData() {
      const selectedDayKey = toDayKey(dayKey);
      const [savedWellness, savedLogs] = await Promise.all([
        getDailyWellness(selectedDayKey),
        listExerciseLogsForDay(selectedDayKey),
      ]);

      if (!isActive) {
        return;
      }

      if (!hasWellnessDraft.current) {
        setPhysicalScoreState(savedWellness?.physicalScore ?? DEFAULT_WELLNESS_SCORE);
        setMentalScoreState(savedWellness?.mentalScore ?? DEFAULT_WELLNESS_SCORE);
      }

      if (!hasNoteDraft.current) {
        setNote(savedWellness?.note ?? "");
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

  const conditionLevel = useMemo(
    () => mapWellnessToCondition({ physicalScore, mentalScore }),
    [mentalScore, physicalScore],
  );

  const recommendations = useMemo(
    () =>
      getTodaysRecommendations({
        catalog: exercises,
        conditionLevel,
        date: dayKey,
      }),
    [exercises, conditionLevel, dayKey],
  );

  const [conditionSaveError, setConditionSaveError] = useState<string | null>(null);

  const saveConditionEntry = useCallback(async () => {
    const selectedDayKey = toDayKey(dayKey);

    try {
      await saveDailyWellness({
        date: selectedDayKey,
        physicalScore,
        mentalScore,
        note,
      });
      setConditionSaveError(null);
    } catch {
      setConditionSaveError("condition_save_error");
    }
  }, [dayKey, mentalScore, note, physicalScore]);

  const updatePhysicalScore = useCallback((nextPhysicalScore: WellnessScore) => {
    hasWellnessDraft.current = true;
    setPhysicalScoreState(nextPhysicalScore);
  }, []);

  const updateMentalScore = useCallback((nextMentalScore: WellnessScore) => {
    hasWellnessDraft.current = true;
    setMentalScoreState(nextMentalScore);
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

  const clearExercise = useCallback(
    async (exerciseId: string) => {
      const selectedDayKey = toDayKey(dayKey);

      setLogResults((currentResults) => {
        const next = { ...currentResults };
        delete next[exerciseId];
        return next;
      });

      await deleteExerciseLogByDateAndExercise(selectedDayKey, exerciseId);
    },
    [dayKey],
  );

  return {
    isHydrated: hydratedDayKey === dayKey,
    physicalScore,
    mentalScore,
    note,
    recommendations,
    logResults,
    conditionSaveError,
    setPhysicalScore: updatePhysicalScore,
    setMentalScore: updateMentalScore,
    setNote: updateNote,
    saveCondition: saveConditionEntry,
    logExercise,
    clearExercise,
  };
}
