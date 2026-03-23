import type { DailyConditionEntry } from "@/lib/types";

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
    updatedAt: new Date().toISOString(),
  });
}
