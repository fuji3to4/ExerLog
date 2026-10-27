import type { Table } from "dexie";

import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

/** Each record table with the tombstone (sheet tab) name its deletions are recorded under. */
function recordTables(): { table: Table<unknown, string>; tombstoneTable: string }[] {
  return [
    { table: appDb.exerciseLogs, tombstoneTable: "ExerciseLogs" },
    { table: appDb.wellnessEntries, tombstoneTable: "WellnessEntries" },
    { table: appDb.watchEvents, tombstoneTable: "WatchEvents" },
    { table: appDb.bodyRecords, tombstoneTable: "BodyMeasurements" },
    { table: appDb.circumferenceRecords, tombstoneTable: "Circumference" },
  ];
}

/**
 * Deletes every exercise log, wellness entry, watch event, body record and
 * circumference record in one transaction and records a tombstone for each
 * deleted id so sync can propagate the deletion.
 */
export async function clearAllRecords(): Promise<void> {
  const tables = recordTables();
  await appDb.transaction("rw", [...tables.map(({ table }) => table), appDb.tombstones], async () => {
    const ids = await Promise.all(tables.map(({ table }) => table.toCollection().primaryKeys()));
    await Promise.all(tables.map(({ table }) => table.clear()));
    for (const [index, { tombstoneTable }] of tables.entries()) {
      await recordTombstones(tombstoneTable, ids[index]);
    }
  });
  scheduleSync();
}

export async function countAllRecords(): Promise<number> {
  const counts = await Promise.all(recordTables().map(({ table }) => table.count()));
  return counts.reduce((sum, n) => sum + n, 0);
}
