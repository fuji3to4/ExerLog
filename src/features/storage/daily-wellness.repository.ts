import type { DailyWellnessEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

export type SaveDailyWellnessInput = Pick<
  DailyWellnessEntry,
  "date" | "physicalScore" | "mentalScore" | "note"
>;

export async function getDailyWellness(date: string) {
  const entry = await appDb.dailyWellness.get(date);

  if (!entry) {
    return undefined;
  }

  return {
    ...entry,
    note: entry.note ?? "",
  };
}

export function saveDailyWellness(input: SaveDailyWellnessInput) {
  return appDb.dailyWellness.put({
    ...input,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  }).then((key) => {
    scheduleSync();
    return key;
  });
}

export function deleteDailyWellness(date: string) {
  return appDb.dailyWellness.delete(date);
}
