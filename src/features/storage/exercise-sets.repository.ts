import type { ExerciseSet } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "ExerciseSets";

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Set name is empty");
  return trimmed;
}

export async function listExerciseSets(): Promise<ExerciseSet[]> {
  return appDb.exerciseSets.orderBy("createdAt").toArray();
}

export async function createExerciseSet(name: string, exerciseIds: string[] = []): Promise<ExerciseSet> {
  const now = localIsoNow();
  const set: ExerciseSet = {
    id: crypto.randomUUID(),
    name: cleanName(name),
    exerciseIds: [...exerciseIds],
    createdAt: now,
    updatedAt: now,
  };
  await appDb.exerciseSets.add(set);
  scheduleSync();
  return set;
}

/** Unknown ids are a silent no-op (the set may have been deleted by a sync meanwhile). */
export async function renameExerciseSet(id: string, name: string): Promise<void> {
  const cleaned = cleanName(name);
  const updated = await appDb.exerciseSets.update(id, { name: cleaned, updatedAt: localIsoNow() });
  if (updated) scheduleSync();
}

/** Unknown set ids are a silent no-op. */
export async function setExerciseInSet(setId: string, exerciseId: string, included: boolean): Promise<void> {
  const changed = await appDb.transaction("rw", appDb.exerciseSets, async () => {
    const set = await appDb.exerciseSets.get(setId);
    if (!set) return false;
    const has = set.exerciseIds.includes(exerciseId);
    if (included === has) return false;
    const exerciseIds = included
      ? [...set.exerciseIds, exerciseId]
      : set.exerciseIds.filter((id) => id !== exerciseId);
    await appDb.exerciseSets.update(setId, { exerciseIds, updatedAt: localIsoNow() });
    return true;
  });
  if (changed) scheduleSync();
}

export async function deleteExerciseSet(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.exerciseSets, appDb.tombstones, async () => {
    await appDb.exerciseSets.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}
