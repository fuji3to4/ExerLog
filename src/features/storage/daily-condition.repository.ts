import type { DailyConditionEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

export type SaveDailyConditionInput = Pick<
  DailyConditionEntry,
  "date" | "conditionLevel" | "note"
>;

export function getDailyCondition(date: string) {
  return appDb.conditions.get(date);
}

export function saveDailyCondition(input: SaveDailyConditionInput) {
  return appDb.conditions.put({
    ...input,
    updatedAt: localIsoNow(),
  }).then((key) => {
    scheduleSync();
    return key;
  });
}

export function updateDailyCondition(entry: DailyConditionEntry): Promise<string> {
  return appDb.conditions.put(entry).then((key) => {
    scheduleSync();
    return key;
  });
}

export function deleteDailyCondition(date: string): Promise<void> {
  return appDb.conditions.delete(date);
}

