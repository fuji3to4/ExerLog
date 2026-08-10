"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { deleteExerciseLogByDateAndExercise, listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";
import { getYouTubeEmbedUrl, resolveExerciseThumbnailUrl } from "@/lib/video/youtube";
import { useTranslation } from "@/features/i18n/use-translation";

type ExerciseDetailScreenProps = {
  exercise: ExerciseVideo;
};

export function ExerciseDetailScreen({ exercise }: ExerciseDetailScreenProps) {
  const [result, setResult] = useState<ExerciseLogResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
  const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);

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

  const handleClear = useCallback(async () => {
    const currentDayKey = toDayKey(new Date());

    setResult(null);

    await deleteExerciseLogByDateAndExercise(currentDayKey, exercise.id);
  }, [exercise.id]);

  return (
    <Card className="exercise-detail">
      {thumbnailUrl ? (
        <div className="exercise-detail__thumbnail">
          {isPlaying && embedUrl ? (
            <iframe
              src={embedUrl}
              title={exercise.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : embedUrl ? (
            <button
              type="button"
              className="exercise-detail__play-button"
              onClick={() => setIsPlaying(true)}
              aria-label={t("action_play_video_aria", { title: exercise.title })}
            >
              <img src={thumbnailUrl} alt={exercise.title} />
              <span className="exercise-detail__play-icon" aria-hidden="true" />
            </button>
          ) : (
            <img src={thumbnailUrl} alt={exercise.title} />
          )}
        </div>
      ) : null}
      <CardHeader>
        <div className="exercise-detail__header">
          <div className="exercise-detail__heading">
            <CardTitle>{exercise.title}</CardTitle>
            <p>{exercise.description}</p>
          </div>
          {!embedUrl ? (
            <a href={exercise.videoUrl} className="today-screen__primary-button" target="_blank" rel="noreferrer">
              {t("action_watch_video")}
            </a>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <dl className="recommendation-card__meta">
          <div>
            <dt>{t("meta_purpose")}</dt>
            <dd>{formatPurpose(exercise.purpose)}</dd>
          </div>
          <div>
            <dt>{t("meta_duration")}</dt>
            <dd>{t("duration_minutes", { count: exercise.durationMinutes })}</dd>
          </div>
          <div>
            <dt>{t("meta_intensity")}</dt>
            <dd>{formatIntensity(exercise.intensity)}</dd>
          </div>
          <div>
            <dt>{t("meta_body_area")}</dt>
            <dd>{formatBodyArea(exercise.bodyArea)}</dd>
          </div>
        </dl>

        {!isHydrated ? (
          <div className="exercise-detail__loading" aria-live="polite">
            <h2>{t("detail_loading_heading")}</h2>
            <p>{t("detail_loading_text")}</p>
          </div>
        ) : (
          <ExerciseLogActions result={result} onLog={(nextResult) => void handleLog(nextResult)} onClear={() => void handleClear()} />
        )}
      </CardContent>
    </Card>
  );
}
