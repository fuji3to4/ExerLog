"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { recordWatchEvent } from "@/features/storage/watch-events.repository";
import type { ExerciseVideo } from "@/lib/types";
import { getYouTubeClip, type YouTubeClip } from "@/lib/video/youtube";

import { IDLE, playlistReducer, type PlaylistAction, type PlaylistState } from "./playlist-queue";
import {
  PLAYLIST_SETTINGS_CHANGED_EVENT,
  readPlaylistSettings,
  writePlaylistSettings,
  type PlaylistSettings,
} from "./playlist-settings-store";

/** `entryKey` names the item's place in the list (a list may repeat a video; see list-entries). */
export type PlaylistItem = { entryKey: string; exercise: ExerciseVideo; clip: YouTubeClip };

export type UsePlaylist = {
  items: PlaylistItem[];
  current: (PlaylistItem & { playId: number }) | null;
  isPlaying: boolean;
  settings: PlaylistSettings;
  /** 🔂: the playing video starts again each time it ends. Not stored; off again once another entry plays. */
  repeatOne: boolean;
  setRepeatOne(on: boolean): void;
  setContinuous(on: boolean): void;
  setLoop(on: boolean): void;
  setAutoCheck(on: boolean): void;
  /** Plays the item with this entry key (its exercise id for a video listed once); the first item without one. */
  start(entryKey?: string): void;
  next(): void;
  previous(): void;
  stop(): void;
  /** Pass to PlaylistPlayer.onEnded; `playId` is the run the player had loaded when it ended. */
  handleEnded(playId: number): void;
  /** Pass to PlaylistPlayer.onError: in continuous mode the broken video is skipped (no log). */
  handleError(playId: number): void;
  /** Pass to PlaylistPlayer.onWatched: records the watch (a skipped video leaves none). */
  handleWatched(playId: number): void;
  /** The user logged the current play by hand: auto-check skips this playId. */
  markManualLog(): void;
};

type UsePlaylistArgs = {
  /** The queue in order (a snapshot of the list the player was opened from, or one video). Items without an
   * `entryKey` are keyed by their id. */
  exercises: (ExerciseVideo & { entryKey?: string })[];
  /** Auto-check: called once per video that played to its end in continuous mode. */
  onFinished: (exercise: ExerciseVideo) => void;
};

const DEFAULT_SETTINGS: PlaylistSettings = { continuous: false, loop: false, autoCheck: false };

export function usePlaylist({ exercises, onFinished }: UsePlaylistArgs): UsePlaylist {
  const items = useMemo(
    () =>
      exercises.flatMap((exercise) => {
        const clip = getYouTubeClip(exercise.videoUrl);
        if (!clip) return [];
        const { entryKey = exercise.id, ...video } = exercise;
        return [{ entryKey, exercise: video, clip }];
      }),
    [exercises],
  );

  const [storedState, setState] = useState<PlaylistState>(IDLE);
  const [settings, setSettings] = useState<PlaylistSettings>(DEFAULT_SETTINGS);
  // The entry being played, so a reordered list (shuffle) keeps playing it.
  const playingKeyRef = useRef<string | null>(null);
  const [repeatOne, setRepeatOneState] = useState(false);
  const repeatOneRef = useRef(false);
  // The last entry that played (kept across a stop), so 🔂 resets only when a different one starts.
  const lastPlayedKeyRef = useRef<string | null>(null);

  // The list was reordered under the playing video: follow it to its new index, same playId
  // (no reload). Done during render so no frame shows the wrong video.
  let state = storedState;
  if (state.status === "playing" && playingKeyRef.current !== null && items[state.index]?.entryKey !== playingKeyRef.current) {
    const playingKey = playingKeyRef.current;
    const movedTo = items.findIndex((item) => item.entryKey === playingKey);
    if (movedTo >= 0) {
      state = playlistReducer(state, { type: "seek", index: movedTo }, { length: items.length, loop: false });
      setState(state);
    }
  }

  // Read in callbacks so a toggle made mid-video applies when that video ends.
  const settingsRef = useRef(settings);
  const itemsRef = useRef(items);
  const stateRef = useRef(state);
  const onFinishedRef = useRef(onFinished);
  const manuallyLoggedRef = useRef(new Set<number>());
  itemsRef.current = items;
  stateRef.current = state;
  onFinishedRef.current = onFinished;

  useEffect(() => {
    const stored = readPlaylistSettings();
    settingsRef.current = stored;
    setSettings(stored);

    // The page can mount more than one copy of the screen (desktop and phone layouts).
    function handleChanged(event: Event) {
      const next = (event as CustomEvent<PlaylistSettings>).detail;
      settingsRef.current = next;
      setSettings(next);
    }
    window.addEventListener(PLAYLIST_SETTINGS_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(PLAYLIST_SETTINGS_CHANGED_EVENT, handleChanged);
  }, []);

  const updateSettings = useCallback((patch: Partial<PlaylistSettings>) => {
    const nextSettings = { ...settingsRef.current, ...patch };
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    writePlaylistSettings(nextSettings);
  }, []);

  const setRepeatOne = useCallback((on: boolean) => {
    repeatOneRef.current = on;
    setRepeatOneState(on);
  }, []);

  const dispatch = useCallback((action: PlaylistAction) => {
    const nextState = playlistReducer(stateRef.current, action, {
      length: itemsRef.current.length,
      loop: settingsRef.current.loop,
    });
    stateRef.current = nextState;
    playingKeyRef.current = nextState.status === "playing" ? (itemsRef.current[nextState.index]?.entryKey ?? null) : null;
    if (playingKeyRef.current !== null) {
      // 🔂 belongs to one video: moving to another entry turns it off.
      if (lastPlayedKeyRef.current !== null && lastPlayedKeyRef.current !== playingKeyRef.current) {
        setRepeatOne(false);
      }
      lastPlayedKeyRef.current = playingKeyRef.current;
    }
    setState(nextState);
  }, [setRepeatOne]);

  const start = useCallback(
    (entryKey?: string) => {
      const index = entryKey === undefined ? 0 : itemsRef.current.findIndex((item) => item.entryKey === entryKey);
      if (index < 0) return;
      dispatch({ type: "start", index });
    },
    [dispatch],
  );

  const handleEnded = useCallback((endedPlayId: number) => {
    const currentState = stateRef.current;
    // Late or duplicate events for an earlier video (or an earlier run) don't count.
    if (currentState.status !== "playing" || currentState.playId !== endedPlayId) return;

    const item = itemsRef.current[currentState.index];
    const settingsNow = settingsRef.current;

    if (repeatOneRef.current) {
      // 🔂: the same entry again (a new playId, so a hand log only covers the pass it was made in).
      if (item && settingsNow.continuous && settingsNow.autoCheck && !manuallyLoggedRef.current.has(endedPlayId)) {
        onFinishedRef.current(item.exercise);
      }
      dispatch({ type: "start", index: currentState.index });
      return;
    }

    if (!settingsNow.continuous) {
      // A single play finishes and stops, so the switch can start a fresh run afterwards.
      dispatch({ type: "stop" });
      return;
    }

    if (item && settingsNow.autoCheck && !manuallyLoggedRef.current.has(endedPlayId)) {
      onFinishedRef.current(item.exercise);
    }
    dispatch({ type: "ended" });
  }, [dispatch]);

  const handleError = useCallback(
    (failedPlayId: number) => {
      const currentState = stateRef.current;
      if (currentState.status !== "playing" || currentState.playId !== failedPlayId) return;
      if (settingsRef.current.continuous) dispatch({ type: "next" });
    },
    [dispatch],
  );

  const markManualLog = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status === "playing") {
      manuallyLoggedRef.current.add(currentState.playId);
    }
  }, []);

  // The playing video was removed from the list (edited elsewhere, synced).
  useEffect(() => {
    const currentState = stateRef.current;
    if (currentState.status === "playing" && currentState.index >= items.length) {
      dispatch({ type: "stop" });
    }
  }, [dispatch, items]);

  const handleWatched = useCallback((watchedPlayId: number) => {
    const currentState = stateRef.current;
    // A late report for a video that was already skipped away from doesn't count.
    if (currentState.status !== "playing" || currentState.playId !== watchedPlayId) return;
    const item = itemsRef.current[currentState.index];
    if (!item) return;
    void recordWatchEvent({ exerciseId: item.exercise.id }).catch(console.error);
  }, []);

  const currentItem = state.status === "playing" ? items[state.index] : undefined;
  const current = state.status === "playing" && currentItem ? { ...currentItem, playId: state.playId } : null;

  return {
    items,
    current,
    isPlaying: current !== null,
    settings,
    repeatOne,
    setRepeatOne,
    setContinuous: useCallback((on: boolean) => updateSettings({ continuous: on }), [updateSettings]),
    setLoop: useCallback((on: boolean) => updateSettings({ loop: on }), [updateSettings]),
    setAutoCheck: useCallback((on: boolean) => updateSettings({ autoCheck: on }), [updateSettings]),
    start,
    next: useCallback(() => dispatch({ type: "next" }), [dispatch]),
    previous: useCallback(() => dispatch({ type: "previous" }), [dispatch]),
    stop: useCallback(() => dispatch({ type: "stop" }), [dispatch]),
    handleEnded,
    handleError,
    handleWatched,
    markManualLog,
  };
}
