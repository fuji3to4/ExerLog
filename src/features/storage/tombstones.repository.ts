import type { Tombstone } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

/**
 * Records that `recordIds` were deleted from `table` (a sheet tab name such as
 * "WellnessEntries") so the merge-based sync can propagate the deletion.
 * Recording the same record again overwrites the previous tombstone.
 */
export async function recordTombstones(table: string, recordIds: string[]): Promise<void> {
  if (recordIds.length === 0) {
    return;
  }

  const deletedAt = localIsoNow();
  await appDb.tombstones.bulkPut(
    recordIds.map((recordId) => ({
      id: `${table}:${recordId}`,
      table,
      recordId,
      deletedAt,
    })),
  );
  scheduleSync();
}

export function listTombstones(): Promise<Tombstone[]> {
  return appDb.tombstones.toArray();
}
