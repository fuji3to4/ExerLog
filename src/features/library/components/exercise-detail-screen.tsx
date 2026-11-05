"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { ExerciseSetMenu } from "@/features/exercise-sets/components/exercise-set-menu";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { useCelebrate } from "@/features/feedback/celebration";
import { shortDayLabel } from "@/features/logging/log-date";
import { addExerciseLog, countExerciseLogsByExercise, countExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { listExerciseSets } from "@/features/storage/exercise-sets.repository";
import { countWatchesByExercise, recordWatchEvent } from "@/features/storage/watch-events.repository";
import { toDayKey } from "@/lib/date/day-key";
import { formatDuration } from "@/lib/date/duration";
import type { ExerciseLogResult, ExerciseSet, ExerciseVideo } from "@/lib/types";
import { getYouTubeEmbedUrl, resolveExerciseThumbnailUrl } from "@/lib/video/youtube";
import { useTranslation } from "@/features/i18n/use-translation";

type ExerciseDetailScreenProps = {
  exercise: ExerciseVideo;
  /** Day to file logs under (from `?date=`); null means today. */
  logDate?: string | null;
  /** Replaces the built-in thumbnail / ▶ / embed (the player screen supplies its own player). */
  media?: ReactNode;
  /** Shown right under `media` (⏮ ⏭ in continuous play). */
  mediaFooter?: ReactNode;
  /** Called after a manual log was saved. */
  onLogged?: () => void;
  /** Bump to re-read the counts after a log saved elsewhere (auto-check). */
  logCountBump?: number;
};

export function ExerciseDetailScreen({
  exercise,
  logDate = null,
  media,
  mediaFooter,
  onLogged,
  logCountBump = 0,
}: ExerciseDetailScreenProps) {
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logError, setLogError] = useState(false);
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [watchCount, setWatchCount] = useState(0);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();
  const celebrate = useCelebrate();
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
  const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);
  // Resolved per render so a page left open past midnight still logs to the new today.
  const today = toDayKey(new Date());
  const targetDate = logDate ?? today;
  const isPastDay = targetDate !== today;

  useEffect(() => {
    let isActive = true;

    async function loadTodayCount() {
      let count = 0;
      let total = 0;
      try {
        const [counts, totals] = await Promise.all([countExerciseLogsForDay(targetDate), countExerciseLogsByExercise()]);
        count = counts[exercise.id] ?? 0;
        total = totals.get(exercise.id) ?? 0;
      } catch (error) {
        console.error(error);
      }

      if (!isActive) {
        return;
      }

      setTodayCount(count);
      setTotalCount(total);
      setIsHydrated(true);
    }

    void loadTodayCount();

    return () => {
      isActive = false;
    };
  }, [exercise.id, targetDate, logCountBump]);

  const loadSets = useCallback(async () => {
    try {
      setSets(await listExerciseSets());
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  useEffect(() => {
    let isActive = true;
    countWatchesByExercise()
      .then((counts) => {
        if (isActive) setWatchCount(counts.get(exercise.id) ?? 0);
      })
      .catch(console.error);
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
      // Tell the player at the tap: a video ending while this saves must not be auto-logged too.
      onLogged?.();
      try {
        const log = await addExerciseLog({
          date: targetDate,
          exerciseId: exercise.id,
          result,
          durationSeconds: exercise.durationSeconds,
        });
        setTodayCount((count) => count + 1);
        setTotalCount((count) => count + 1);
        // Catching up on a past day is bookkeeping, not an achievement just now: no celebration.
        if (!isPastDay) celebrate({ result, durationSeconds: log.durationSeconds });
      } catch (error) {
        console.error(error);
        setLogError(true);
      }
    },
    [exercise.id, exercise.durationSeconds, celebrate, targetDate, isPastDay, onLogged],
  );

  return (
    <Card className="exercise-detail">
      {media !== undefined ? (
        <>
          <div className="exercise-detail__thumbnail">{media}</div>
          {mediaFooter}
        </>
      ) : thumbnailUrl ? (
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
      <CardContent className="exercise-detail__body">
        <h2 className="exercise-detail__title">{exercise.title}</h2>
        <p className="exercise-detail__meta">
          {[
            formatDuration(exercise.durationSeconds),
            t("meta_intensity_value", { value: formatIntensity(exercise.intensity) }),
            formatBodyArea(exercise.bodyArea),
            formatPurpose(exercise.purpose),
            watchCount > 0 ? t("library_watch_count", { count: watchCount }) : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="exercise-detail__actions">
          {!embedUrl ? (
            <a href={exercise.videoUrl} className="today-screen__primary-button" target="_blank" rel="noreferrer" onClick={handleWatch}>
              {t("action_watch_video")}
            </a>
          ) : null}
          {isHydrated ? (
            <ExerciseLogActions todayCount={todayCount} onLog={(result) => void handleLog(result)} showStatus={false} />
          ) : null}
          <ExerciseSetMenu exercise={exercise} sets={sets} onChanged={() => void loadSets()} variant="button" />
        </div>
        {logError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("log_save_error")}
          </p>
        ) : null}

        <div className="exercise-detail__description">
          {!isHydrated ? (
            <div className="exercise-detail__loading" aria-live="polite">
              <h2>{t("detail_loading_heading")}</h2>
              <p>{t("detail_loading_text")}</p>
            </div>
          ) : (
            <p className="exercise-detail__status" aria-live="polite">
              {isPastDay
                ? t("log_count_on_day_total", { date: shortDayLabel(targetDate), count: todayCount, total: totalCount })
                : t("log_count_today_total", { count: todayCount, total: totalCount })}
            </p>
          )}
          {exercise.description ? <p>{exercise.description}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
