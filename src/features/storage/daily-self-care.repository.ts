import type { DailySelfCareEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "./app-db";

export type SelfCareDraft = Pick<
  DailySelfCareEntry,
  "selfCareId" | "isDone" | "count" | "minutes" | "note"
>;

export function listDailySelfCareEntriesByDate(date: string) {
  return appDb.dailySelfCareLogs.where("date").equals(date).sortBy("selfCareId");
}

export async function replaceDailySelfCareEntries(date: string, entries: SelfCareDraft[]) {
  return appDb.transaction("rw", appDb.dailySelfCareLogs, async () => {
    await appDb.dailySelfCareLogs.where("date").equals(date).delete();

    if (entries.length === 0) {
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
  });
}
