import type { Table } from "dexie";

import { recordModuleData } from "@/features/modules/data-registry";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

/**
 * Deletes every exercise log, watch event and record of every module (also
 * modules that are switched off) in one transaction and records a tombstone
 * for each deleted id so sync can propagate the deletion.
 */
export async function clearAllRecords(): Promise<void> {
  const modules = recordModuleData();
  await appDb.transaction(
    "rw",
    [appDb.exerciseLogs, appDb.watchEvents, appDb.tombstones, ...modules.flatMap((m) => m.tables())],
    async () => {
      const exerciseIds = await appDb.exerciseLogs.toCollection().primaryKeys();
      const watchIds = await appDb.watchEvents.toCollection().primaryKeys();
      await appDb.exerciseLogs.clear();
      await appDb.watchEvents.clear();
      await recordTombstones("ExerciseLogs", exerciseIds);
      await recordTombstones("WatchEvents", watchIds);
      for (const module of modules) {
        await module.clearAll();
      }
    },
  );
  scheduleSync();
}

export async function countAllRecords(): Promise<number> {
  const counts = await Promise.all([
    appDb.exerciseLogs.count(),
    appDb.watchEvents.count(),
    ...recordModuleData().map((m) => m.count()),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}
