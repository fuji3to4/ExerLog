import type { DailyWellnessEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "./app-db";

export type SaveDailyWellnessInput = Pick<
  DailyWellnessEntry,
  "date" | "physicalScore" | "mentalScore"
>;

export function getDailyWellness(date: string) {
  return appDb.dailyWellness.get(date);
}

export function saveDailyWellness(input: SaveDailyWellnessInput) {
  return appDb.dailyWellness.put({
    ...input,
    updatedAt: localIsoNow(),
  });
}
