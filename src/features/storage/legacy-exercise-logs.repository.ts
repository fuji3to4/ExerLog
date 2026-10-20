/**
 * Legacy one-log-per-exercise-per-day storage on the old `logs` table.
 * Kept only until the UI switches to exercise-logs.repository; removed with
 * the `logs` table.
 */
import type { LegacyExerciseLog } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

export type SaveLegacyExerciseLogInput = Pick<
  LegacyExerciseLog,
  "date" | "exerciseId" | "result"
>;

export async function saveLegacyExerciseLog(input: SaveLegacyExerciseLogInput) {
  return appDb.transaction("rw", appDb.logs, async () => {
    const existingLog = await appDb.logs
      .where("[date+exerciseId]")
      .equals([input.date, input.exerciseId])
      .first();

    return appDb.logs.put({
      ...input,
      id: existingLog?.id ?? crypto.randomUUID(),
      loggedAt: localIsoNow(),
    }).then((id) => {
      scheduleSync();
      return id;
    });
  });
}

export function listLegacyExerciseLogsForDay(date: string) {
  return appDb.logs.where("date").equals(date).sortBy("exerciseId");
}

export async function updateLegacyExerciseLog(log: LegacyExerciseLog): Promise<void> {
  await appDb.logs.put(log);
  scheduleSync();
}

export function deleteLegacyExerciseLog(id: string): Promise<void> {
  return appDb.logs.delete(id);
}

export async function deleteLegacyExerciseLogByDateAndExercise(date: string, exerciseId: string): Promise<void> {
  await appDb.logs.where("[date+exerciseId]").equals([date, exerciseId]).delete();
}

export function clearAllLegacyExerciseLogs(): Promise<void> {
  return appDb.logs.clear();
}
