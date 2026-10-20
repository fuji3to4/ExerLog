import type { DailySelfCareEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "DailySelfCare";

export type SelfCareDraft = Pick<
  DailySelfCareEntry,
  "selfCareId" | "isDone" | "count" | "minutes" | "note"
>;

export function listDailySelfCareEntriesByDate(date: string) {
  return appDb.dailySelfCareLogs.where("date").equals(date).sortBy("selfCareId");
}

export async function replaceDailySelfCareEntries(date: string, entries: SelfCareDraft[]) {
  return appDb.transaction("rw", appDb.dailySelfCareLogs, appDb.tombstones, async () => {
    const existing = appDb.dailySelfCareLogs.where("date").equals(date);
    const removedIds = await existing.primaryKeys();
    await existing.delete();
    await recordTombstones(TOMBSTONE_TABLE, removedIds);

    if (entries.length === 0) {
      scheduleSync();
      return;
    }

    const selfCareIds = new Set<string>();

    for (const entry of entries) {
      if (selfCareIds.has(entry.selfCareId)) {
        throw new Error("Duplicate selfCareId values in entries array");
      }

      selfCareIds.add(entry.selfCareId);
    }

    const recordedAt = localIsoNow();

    await appDb.dailySelfCareLogs.bulkAdd(
      entries.map((entry) => ({
        id: crypto.randomUUID(),
        date,
        ...entry,
        recordedAt,
      })),
    );
    scheduleSync();
  });
}
