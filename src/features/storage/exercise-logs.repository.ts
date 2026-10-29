import type { ExerciseLog } from "@/lib/types";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "ExerciseLogs";

export type AddExerciseLogInput = Pick<
  ExerciseLog,
  "date" | "exerciseId" | "result" | "durationSeconds"
> & { performedAt?: string };

export async function addExerciseLog(input: AddExerciseLogInput): Promise<ExerciseLog> {
  const log: ExerciseLog = {
    id: crypto.randomUUID(),
    date: input.date,
    exerciseId: input.exerciseId,
    result: input.result,
    durationSeconds: input.durationSeconds,
    performedAt: input.performedAt ?? localIsoAt(input.date),
    updatedAt: localIsoNow(),
  };
  await appDb.exerciseLogs.add(log);
  scheduleSync();
  return log;
}

export async function updateExerciseLog(log: ExerciseLog): Promise<void> {
  await appDb.exerciseLogs.put({ ...log, updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteExerciseLog(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.exerciseLogs, appDb.tombstones, async () => {
    await appDb.exerciseLogs.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Logs for the day, in the order they were performed. */
export function listExerciseLogsForDay(date: string): Promise<ExerciseLog[]> {
  return appDb.exerciseLogs.where("date").equals(date).sortBy("performedAt");
}

/** Logs on days before `date`. */
export function listExerciseLogsBefore(date: string): Promise<ExerciseLog[]> {
  return appDb.exerciseLogs.where("date").below(date).toArray();
}

/** Number of logs per exerciseId for the day. */
export async function countExerciseLogsForDay(date: string): Promise<Record<string, number>> {
  const logs = await appDb.exerciseLogs.where("date").equals(date).toArray();
  const counts: Record<string, number> = {};
  for (const log of logs) {
    counts[log.exerciseId] = (counts[log.exerciseId] ?? 0) + 1;
  }
  return counts;
}

export async function clearAllExerciseLogs(): Promise<void> {
  await appDb.transaction("rw", appDb.exerciseLogs, appDb.tombstones, async () => {
    const ids = await appDb.exerciseLogs.toCollection().primaryKeys();
    await appDb.exerciseLogs.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  });
  scheduleSync();
}
