import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

/**
 * Deletes every exercise log, wellness entry, watch event and measurement in one
 * transaction and records a tombstone for each deleted id so sync can
 * propagate the deletion.
 */
export async function clearAllRecords(): Promise<void> {
  await appDb.transaction(
    "rw",
    [appDb.exerciseLogs, appDb.wellnessEntries, appDb.watchEvents, appDb.measurements, appDb.tombstones],
    async () => {
      const [logIds, wellnessIds, watchIds, measurementIds] = await Promise.all([
        appDb.exerciseLogs.toCollection().primaryKeys(),
        appDb.wellnessEntries.toCollection().primaryKeys(),
        appDb.watchEvents.toCollection().primaryKeys(),
        appDb.measurements.toCollection().primaryKeys(),
      ]);
      await Promise.all([
        appDb.exerciseLogs.clear(),
        appDb.wellnessEntries.clear(),
        appDb.watchEvents.clear(),
        appDb.measurements.clear(),
      ]);
      await recordTombstones("ExerciseLogs", logIds);
      await recordTombstones("WellnessEntries", wellnessIds);
      await recordTombstones("WatchEvents", watchIds);
      await recordTombstones("Measurements", measurementIds);
    },
  );
  scheduleSync();
}

export async function countAllRecords(): Promise<number> {
  const counts = await Promise.all([
    appDb.exerciseLogs.count(),
    appDb.wellnessEntries.count(),
    appDb.watchEvents.count(),
    appDb.measurements.count(),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}
