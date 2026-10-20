"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { useCelebrate } from "@/features/feedback/celebration";
import { addExerciseLog, countExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { recordWatchEvent } from "@/features/storage/watch-events.repository";
import { toDayKey } from "@/lib/date/day-key";
import { formatDuration } from "@/lib/date/duration";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";
import { getYouTubeEmbedUrl, resolveExerciseThumbnailUrl } from "@/lib/video/youtube";
import { useTranslation } from "@/features/i18n/use-translation";

type ExerciseDetailScreenProps = {
  exercise: ExerciseVideo;
};

export function ExerciseDetailScreen({ exercise }: ExerciseDetailScreenProps) {
  const [todayCount, setTodayCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logError, setLogError] = useState(false);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();
  const celebrate = useCelebrate();
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
  const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);

  useEffect(() => {
    let isActive = true;

    async function loadTodayCount() {
      let count = 0;
      try {
        const counts = await countExerciseLogsForDay(toDayKey(new Date()));
        count = counts[exercise.id] ?? 0;
      } catch (error) {
        console.error(error);
      }

      if (!isActive) {
        return;
      }

      setTodayCount(count);
      setIsHydrated(true);
    }

    void loadTodayCount();

    return () => {
      isActive = false;
    };
  }, [exercise.id]);

  const handleWatch = useCallback(() => {
    void recordWatchEvent({ exerciseId: exercise.id }).catch(console.error);
  }, [exercise.id]);

  const handleLog = useCallback(
    async (result: ExerciseLogResult) => {
      setLogError(false);
      try {
        const log = await addExerciseLog({
          date: toDayKey(new Date()),
          exerciseId: exercise.id,
          result,
          durationSeconds: exercise.durationSeconds,
        });
        setTodayCount((count) => count + 1);
        celebrate({ result, durationSeconds: log.durationSeconds });
      } catch (error) {
        console.error(error);
        setLogError(true);
      }
    },
    [exercise.id, exercise.durationSeconds, celebrate],
  );

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
              onClick={() => {
                handleWatch();
                setIsPlaying(true);
              }}
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
            <a href={exercise.videoUrl} className="today-screen__primary-button" target="_blank" rel="noreferrer" onClick={handleWatch}>
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
            <dd>{formatDuration(exercise.durationSeconds)}</dd>
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
          <>
            <ExerciseLogActions todayCount={todayCount} onLog={(result) => void handleLog(result)} />
            {logError ? (
              <p role="alert" className="text-sm text-destructive">
                {t("log_save_error")}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
