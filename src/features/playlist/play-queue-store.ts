"use client";

import { useEffect } from "react";

/** The list the player screen was opened from, handed over through sessionStorage. */
export const PLAY_QUEUE_STORAGE_KEY = "exerlog-play-queue";

/**
 * `name` is already translated ("朝", "すべて", "今日のおすすめ"). `source: "library"` links the
 * player's shuffle to the library's sort. When `shuffled`, `exerciseIds` is the shuffled order and
 * `unshuffledIds` the order to go back to when shuffle is turned off.
 */
export type PlayQueue = {
  name: string;
  exerciseIds: string[];
  source?: "library";
  shuffled?: boolean;
  unshuffledIds?: string[];
  /** The whole list (set or すべて) before search/filters, so the player can shuffle all of it for the library. */
  listIds?: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string");
}

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
    const { name, exerciseIds, source, shuffled, unshuffledIds, listIds } = parsed as Record<string, unknown>;
    if (typeof name !== "string" || !isStringArray(exerciseIds)) {
      return null;
    }
    const queue: PlayQueue = { name, exerciseIds };
    if (source === "library") queue.source = "library";
    if (typeof shuffled === "boolean") queue.shuffled = shuffled;
    if (isStringArray(unshuffledIds)) queue.unshuffledIds = unshuffledIds;
    if (isStringArray(listIds)) queue.listIds = listIds;
    return queue;
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
  // Compared as one string so a new but equal object doesn't rewrite storage on every render.
  const serialized = queue ? JSON.stringify(queue) : null;

  useEffect(() => {
    if (serialized === null) return;
    writePlayQueue(JSON.parse(serialized) as PlayQueue);
  }, [serialized]);
}
