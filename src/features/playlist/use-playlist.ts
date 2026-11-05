"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { recordWatchEvent } from "@/features/storage/watch-events.repository";
import type { ExerciseVideo } from "@/lib/types";
import { getYouTubeClip, type YouTubeClip } from "@/lib/video/youtube";

import { IDLE, playlistReducer, type PlaylistAction, type PlaylistState } from "./playlist-queue";
import { readPlaylistSettings, writePlaylistSettings, type PlaylistSettings } from "./playlist-settings-store";

export type PlaylistItem = { exercise: ExerciseVideo; clip: YouTubeClip };

export type UsePlaylist = {
  items: PlaylistItem[];
  current: (PlaylistItem & { playId: number }) | null;
  isPlaying: boolean;
  settings: PlaylistSettings;
  setLoop(on: boolean): void;
  setAutoCheck(on: boolean): void;
  start(exerciseId?: string): void;
  next(): void;
  previous(): void;
  stop(): void;
  handleEnded(): void;
};

type UsePlaylistArgs = {
  exercises: ExerciseVideo[];
  /** The selected set's id; when it changes, playback stops. */
  listKey: string | null;
  /** Called once per finished video, only when auto-check is on at that moment. */
  onFinished: (exercise: ExerciseVideo) => void;
};

export function usePlaylist({ exercises, listKey, onFinished }: UsePlaylistArgs): UsePlaylist {
  const items = useMemo(
    () =>
      exercises.flatMap((exercise) => {
        const clip = getYouTubeClip(exercise.videoUrl);
        return clip ? [{ exercise, clip }] : [];
      }),
    [exercises],
  );

  const [state, setState] = useState<PlaylistState>(IDLE);
  const [settings, setSettings] = useState<PlaylistSettings>({ loop: false, autoCheck: false });

  // Read in callbacks so a toggle made mid-video applies when that video ends.
  const settingsRef = useRef(settings);
  const itemsRef = useRef(items);
  const stateRef = useRef(state);
  const onFinishedRef = useRef(onFinished);
  const finishedPlayIdRef = useRef<number | null>(null);
  itemsRef.current = items;
  stateRef.current = state;
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const stored = readPlaylistSettings();
    settingsRef.current = stored;
    setSettings(stored);
  }, []);

  const updateSettings = useCallback((patch: Partial<PlaylistSettings>) => {
    const nextSettings = { ...settingsRef.current, ...patch };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    writePlaylistSettings(nextSettings);
  }, []);

  const dispatch = useCallback((action: PlaylistAction) => {
    const nextState = playlistReducer(stateRef.current, action, {
      length: itemsRef.current.length,
      loop: settingsRef.current.loop,
    });
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const start = useCallback(
    (exerciseId?: string) => {
      const index = exerciseId === undefined ? 0 : itemsRef.current.findIndex((item) => item.exercise.id === exerciseId);
      if (index < 0) return;
      dispatch({ type: "start", index });
    },
    [dispatch],
  );

  const playId = state.status === "playing" ? state.playId : null;

  const handleEnded = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status !== "playing" || currentState.playId !== playId) return;
    if (finishedPlayIdRef.current === playId) return;
    finishedPlayIdRef.current = playId;

    const item = itemsRef.current[currentState.index];
    if (item && settingsRef.current.autoCheck) {
      onFinishedRef.current(item.exercise);
    }
    dispatch({ type: "ended" });
  }, [dispatch, playId]);

  // A list switch ends the run.
  const listKeyRef = useRef(listKey);
  useEffect(() => {
    if (listKeyRef.current !== listKey) {
      listKeyRef.current = listKey;
      dispatch({ type: "stop" });
    }
  }, [dispatch, listKey]);

  // The playing video was removed from the list (edited elsewhere, synced).
  useEffect(() => {
    const currentState = stateRef.current;
    if (currentState.status === "playing" && currentState.index >= items.length) {
      dispatch({ type: "stop" });
    }
  }, [dispatch, items]);

  const currentItem = state.status === "playing" ? items[state.index] : undefined;
  const current = state.status === "playing" && currentItem ? { ...currentItem, playId: state.playId } : null;
  const currentExerciseId = current?.exercise.id;

  useEffect(() => {
    if (playId === null || currentExerciseId === undefined) return;
    void recordWatchEvent({ exerciseId: currentExerciseId }).catch(console.error);
    // Once per started video, keyed by playId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  return {
    items,
    current,
    isPlaying: current !== null,
    settings,
    setLoop: useCallback((on: boolean) => updateSettings({ loop: on }), [updateSettings]),
    setAutoCheck: useCallback((on: boolean) => updateSettings({ autoCheck: on }), [updateSettings]),
    start,
    next: useCallback(() => dispatch({ type: "next" }), [dispatch]),
    previous: useCallback(() => dispatch({ type: "previous" }), [dispatch]),
    stop: useCallback(() => dispatch({ type: "stop" }), [dispatch]),
    handleEnded,
  };
}
