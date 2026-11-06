"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { BackButton } from "@/features/library/components/back-button";
import { ExerciseDetailScreen } from "@/features/library/components/exercise-detail-screen";
import { LogDateNotice } from "@/features/logging/components/log-date-notice";
import { getExerciseById } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { ExerciseVideo } from "@/lib/types";
import { useWakeLock } from "@/lib/wake-lock/use-wake-lock";
import { getYouTubeClip, resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

import { resolvePlayQueue } from "../play-queue-store";
import { readPlaylistSettings } from "../playlist-settings-store";
import { usePlaylist } from "../use-playlist";
import { ContinuousStatus, ContinuousSwitch } from "./continuous-bar";
import { PlaylistPlayer } from "./playlist-player";
import { UpNext } from "./up-next";

type PlayerScreenProps = {
  /** The exercise the screen was opened for (`?exerciseId=`). */
  exercise: ExerciseVideo;
  /** Day to file logs under (from `?date=`); null means today. */
  logDate: string | null;
};

type Queue = { name: string; exercises: ExerciseVideo[] };

async function loadQueue(exercise: ExerciseVideo): Promise<Queue | null> {
  const stored = resolvePlayQueue(exercise.id);
  if (!stored) return null;
  const found = await Promise.all(
    stored.exerciseIds.map((id) => (id === exercise.id ? Promise.resolve(exercise) : getExerciseById(id))),
  );
  return { name: stored.name, exercises: found.filter((item): item is ExerciseVideo => Boolean(item)) };
}

function replaceExerciseIdInUrl(exerciseId: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("exerciseId") === exerciseId) return;
  url.searchParams.set("exerciseId", exerciseId);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

/**
 * The video player screen. With 連続再生 on it plays the list it was opened from (handed over by
 * Library / Today) back-to-back in one YouTube player; the rest of the screen follows the video.
 */
export function PlayerScreen({ exercise, logDate }: PlayerScreenProps) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<Queue | null | undefined>(undefined);
  const [displayed, setDisplayed] = useState(exercise);
  const [logCountBump, setLogCountBump] = useState(0);
  const [autoLogError, setAutoLogError] = useState(false);

  useEffect(() => {
    let active = true;
    loadQueue(exercise)
      .then((loaded) => {
        if (active) setQueue(loaded);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) setQueue(null);
      });
    return () => {
      active = false;
    };
  }, [exercise]);

  const queueExercises = useMemo(() => queue?.exercises ?? [exercise], [queue, exercise]);
  const queueName = queue?.name ?? t("playlist_single_name");

  const targetDate = logDate ?? toDayKey(new Date());
  const handleFinished = useCallback(
    (finished: ExerciseVideo) => {
      setAutoLogError(false);
      // Quiet on purpose: no celebration over the video that is about to start.
      addExerciseLog({ date: targetDate, exerciseId: finished.id, result: "did", durationSeconds: finished.durationSeconds })
        .then(() => setLogCountBump((n) => n + 1))
        .catch((error: unknown) => {
          console.error(error);
          setAutoLogError(true);
        });
    },
    [targetDate],
  );

  const playlist = usePlaylist({ exercises: queueExercises, onFinished: handleFinished });
  const { settings, current } = playlist;

  // Autoplay once the list is known, if the mode was left on last time.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (queue === undefined || autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (readPlaylistSettings().continuous) {
      playlist.start(exercise.id);
    }
  }, [queue, exercise.id, playlist]);

  const currentExercise = current?.exercise ?? null;
  useEffect(() => {
    if (!currentExercise) return;
    setDisplayed(currentExercise);
    replaceExerciseIdInUrl(currentExercise.id);
  }, [currentExercise]);

  useWakeLock(settings.continuous && playlist.isPlaying);

  const isQueueReady = queue !== undefined;

  function handleContinuousChange(on: boolean) {
    playlist.setContinuous(on);
    // Before the list is known, the autoplay effect starts the run once it arrives.
    if (on && isQueueReady && !playlist.isPlaying) {
      playlist.start(displayed.id);
    }
  }

  const index = playlist.items.findIndex((item) => item.exercise.id === displayed.id);
  const position =
    index >= 0
      ? t("playlist_position", { name: queueName, index: index + 1, total: playlist.items.length })
      : null;
  const upcoming = index >= 0 ? playlist.items.slice(index + 1).map((item) => item.exercise) : [];

  const isEmbeddable = getYouTubeClip(displayed.videoUrl) !== null;
  const thumbnailUrl = resolveExerciseThumbnailUrl(displayed);

  let media: ReactNode = undefined;
  if (current) {
    media = (
      <PlaylistPlayer
        clip={current.clip}
        playId={current.playId}
        title={current.exercise.title}
        onEnded={playlist.handleEnded}
        onError={playlist.handleError}
        onWatched={playlist.handleWatched}
      />
    );
  } else if (isEmbeddable) {
    media = (
      <button
        type="button"
        className="exercise-detail__play-button"
        // Wait for the list: starting earlier would play index 0 of a list that is about to change.
        disabled={!isQueueReady}
        onClick={() => playlist.start(displayed.id)}
        aria-label={t("action_play_video_aria", { title: displayed.title })}
      >
        {thumbnailUrl ? <img src={thumbnailUrl} alt={displayed.title} /> : null}
        <span className="exercise-detail__play-icon" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="player-screen__top-row">
        <BackButton />
        <ContinuousSwitch checked={settings.continuous} onChange={handleContinuousChange} />
      </div>
      <LogDateNotice logDate={logDate} />
      {settings.continuous ? <ContinuousStatus playlist={playlist} position={position} /> : null}

      <ExerciseDetailScreen
        exercise={displayed}
        logDate={logDate}
        media={media}
        onLogged={playlist.markManualLog}
        logCountBump={logCountBump}
        mediaFooter={
          settings.continuous && playlist.items.length > 0 ? (
            <div className="playlist-now-playing__buttons">
              <Button size="icon" className="player-screen__skip" aria-label={t("playlist_previous_aria")} onClick={playlist.previous}>
                <SkipBack aria-hidden="true" size={22} />
              </Button>
              <Button size="icon" className="player-screen__skip" aria-label={t("playlist_next_aria")} onClick={playlist.next}>
                <SkipForward aria-hidden="true" size={22} />
              </Button>
            </div>
          ) : null
        }
      />
      {autoLogError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("log_save_error")}
        </p>
      ) : null}

      {settings.continuous ? <UpNext upcoming={upcoming} onSelect={(id) => playlist.start(id)} /> : null}
    </div>
  );
}
