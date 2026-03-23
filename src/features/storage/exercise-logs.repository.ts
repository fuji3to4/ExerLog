import type { ExerciseLog } from "@/lib/types";

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
      loggedAt: new Date().toISOString(),
    });
  });
}

export function listExerciseLogsForDay(date: string) {
  return appDb.logs.where("date").equals(date).sortBy("exerciseId");
}
