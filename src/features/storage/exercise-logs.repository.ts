import type { ExerciseLog } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "./app-db";

export type SaveExerciseLogInput = Pick<
  ExerciseLog,
  "date" | "exerciseId" | "result"
>;

export async function saveExerciseLog(input: SaveExerciseLogInput) {
  return appDb.transaction("rw", appDb.logs, async () => {
    const existingLog = await appDb.logs
      .where("[date+exerciseId]")
      .equals([input.date, input.exerciseId])
      .first();

    return appDb.logs.put({
      ...input,
      id: existingLog?.id ?? crypto.randomUUID(),
      loggedAt: localIsoNow(),
    });
  });
}

export function listExerciseLogsForDay(date: string) {
  return appDb.logs.where("date").equals(date).sortBy("exerciseId");
}

export async function updateExerciseLog(log: ExerciseLog): Promise<void> {
  await appDb.logs.put(log);
}

export function deleteExerciseLog(id: string): Promise<void> {
  return appDb.logs.delete(id);
}

export async function deleteExerciseLogByDateAndExercise(date: string, exerciseId: string): Promise<void> {
  await appDb.logs.where("[date+exerciseId]").equals([date, exerciseId]).delete();
}

export function clearAllExerciseLogs(): Promise<void> {
  return appDb.logs.clear();
}

