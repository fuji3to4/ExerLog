"use client";

import { useEffect } from "react";

/** The list the player screen was opened from, handed over through sessionStorage. */
export const PLAY_QUEUE_STORAGE_KEY = "exerlog-play-queue";

/** `name` is already translated ("朝", "すべて", "今日のおすすめ"). */
export type PlayQueue = { name: string; exerciseIds: string[] };

export function writePlayQueue(queue: PlayQueue): void {
  try {
    window.sessionStorage.setItem(PLAY_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: the player falls back to the opened video alone.
  }
}

export function readPlayQueue(): PlayQueue | null {
  try {
    const raw = window.sessionStorage.getItem(PLAY_QUEUE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { name, exerciseIds } = parsed as Partial<PlayQueue>;
    if (typeof name !== "string" || !Array.isArray(exerciseIds) || !exerciseIds.every((id) => typeof id === "string")) {
      return null;
    }
    return { name, exerciseIds };
  } catch {
    return null;
  }
}

/** The stored queue if it contains `exerciseId`; otherwise null (play that exercise alone). */
export function resolvePlayQueue(exerciseId: string): PlayQueue | null {
  const queue = readPlayQueue();
  return queue && queue.exerciseIds.includes(exerciseId) ? queue : null;
}

/** Publishes the list a screen currently shows, so a tap into the player can play it in order. */
export function usePublishPlayQueue(queue: PlayQueue | null): void {
  const name = queue?.name ?? null;
  const ids = queue ? queue.exerciseIds.join("\n") : null;

  useEffect(() => {
    if (name === null || ids === null) return;
    writePlayQueue({ name, exerciseIds: ids === "" ? [] : ids.split("\n") });
  }, [name, ids]);
}
