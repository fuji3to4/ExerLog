"use client";

import { useCallback, useEffect, useState } from "react";

import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";

type ExerciseDetailScreenProps = {
  exercise: ExerciseVideo;
};

export function ExerciseDetailScreen({ exercise }: ExerciseDetailScreenProps) {
  const [result, setResult] = useState<ExerciseLogResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadTodayLog() {
      const currentDayKey = toDayKey(new Date());
      const logs = await listExerciseLogsForDay(currentDayKey);
      const existingLog = logs.find((entry) => entry.exerciseId === exercise.id);

      if (!isActive) {
        return;
      }

      setResult(existingLog?.result ?? null);
      setIsHydrated(true);
    }

    void loadTodayLog();

    return () => {
      isActive = false;
    };
  }, [exercise.id]);

  const handleLog = useCallback(
    async (nextResult: ExerciseLogResult) => {
      const currentDayKey = toDayKey(new Date());

      setResult(nextResult);

      await saveExerciseLog({
        date: currentDayKey,
        exerciseId: exercise.id,
        result: nextResult,
      });
    },
    [exercise.id],
  );

  return (
    <section className="card exercise-detail">
      <div className="exercise-detail__header">
        <div className="exercise-detail__heading">
          <h1>{exercise.title}</h1>
          <p>{exercise.description}</p>
        </div>
        <a href={exercise.videoUrl} className="today-screen__primary-button" target="_blank" rel="noreferrer">
          Watch video
        </a>
      </div>

      <dl className="recommendation-card__meta">
        <div>
          <dt>Purpose</dt>
          <dd>{exercise.purpose}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{exercise.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Intensity</dt>
          <dd>{exercise.intensity}</dd>
        </div>
        <div>
          <dt>Body area</dt>
          <dd>{exercise.bodyArea.replace("-", " ")}</dd>
        </div>
      </dl>

      {!isHydrated ? (
        <div className="exercise-detail__loading" aria-live="polite">
          <h2>Loading today&apos;s log...</h2>
          <p>Checking whether you already logged this exercise for today.</p>
        </div>
      ) : (
        <ExerciseLogActions result={result} onLog={(nextResult) => void handleLog(nextResult)} />
      )}
    </section>
  );
}
