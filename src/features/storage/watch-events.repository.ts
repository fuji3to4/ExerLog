import type { WatchEvent } from "@/lib/types";

import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "WatchEvents";

/** A repeat watch of the same exercise within this window is not recorded. */
export const WATCH_DEDUPE_MS = 600_000;

export type RecordWatchEventInput = {
  exerciseId: string;
  date?: string;
  watchedAt?: string;
};

/**
 * Records a watch of `exerciseId`. Returns null (and records nothing) when the
 * same exercise was already watched within WATCH_DEDUPE_MS before `watchedAt`.
 */
export async function recordWatchEvent(input: RecordWatchEventInput): Promise<WatchEvent | null> {
  const date = input.date ?? toDayKey(new Date());
  const watchedAt = input.watchedAt ?? localIsoAt(date);
  const watchedAtMs = Date.parse(watchedAt);

  const created = await appDb.transaction("rw", appDb.watchEvents, async () => {
    const existing = await appDb.watchEvents.where("exerciseId").equals(input.exerciseId).toArray();
    const isDuplicate = existing.some((event) => {
      const diff = watchedAtMs - Date.parse(event.watchedAt);
      return diff >= 0 && diff < WATCH_DEDUPE_MS;
    });
    if (isDuplicate) {
      return null;
    }

    const event: WatchEvent = {
      id: crypto.randomUUID(),
      date,
      exerciseId: input.exerciseId,
      watchedAt,
      updatedAt: localIsoNow(),
    };
    await appDb.watchEvents.add(event);
    return event;
  });

  if (created) {
    scheduleSync();
  }
  return created;
}

export async function updateWatchEvent(event: WatchEvent): Promise<void> {
  await appDb.watchEvents.put({ ...event, updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteWatchEvent(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.watchEvents, appDb.tombstones, async () => {
    await appDb.watchEvents.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Number of recorded watches per exercise id; exercises never watched are absent. */
export async function countWatchesByExercise(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  await appDb.watchEvents.each((event) => {
    counts.set(event.exerciseId, (counts.get(event.exerciseId) ?? 0) + 1);
  });
  return counts;
}

/** Watches for the day, oldest first. */
export function listWatchEventsForDay(date: string): Promise<WatchEvent[]> {
  return appDb.watchEvents.where("date").equals(date).sortBy("watchedAt");
}
