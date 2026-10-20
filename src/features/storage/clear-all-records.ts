import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

/**
 * Deletes every exercise log, wellness entry and watch event in one
 * transaction and records a tombstone for each deleted id so sync can
 * propagate the deletion.
 */
export async function clearAllRecords(): Promise<void> {
  await appDb.transaction(
    "rw",
    appDb.exerciseLogs,
    appDb.wellnessEntries,
    appDb.watchEvents,
    appDb.tombstones,
    async () => {
      const [logIds, wellnessIds, watchIds] = await Promise.all([
        appDb.exerciseLogs.toCollection().primaryKeys(),
        appDb.wellnessEntries.toCollection().primaryKeys(),
        appDb.watchEvents.toCollection().primaryKeys(),
      ]);
      await Promise.all([
        appDb.exerciseLogs.clear(),
        appDb.wellnessEntries.clear(),
        appDb.watchEvents.clear(),
      ]);
      await recordTombstones("ExerciseLogs", logIds);
      await recordTombstones("WellnessEntries", wellnessIds);
      await recordTombstones("WatchEvents", watchIds);
    },
  );
  scheduleSync();
}

export async function countAllRecords(): Promise<number> {
  const counts = await Promise.all([
    appDb.exerciseLogs.count(),
    appDb.wellnessEntries.count(),
    appDb.watchEvents.count(),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}
