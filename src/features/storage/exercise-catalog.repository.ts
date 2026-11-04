import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import type { ExerciseDraft, ExerciseVideo } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "Exercises";

/** Sets `updatedAt` to now so sync sees this write as newer than any earlier tombstone. */
function stamp(exercises: ExerciseDraft[]): ExerciseVideo[] {
  const updatedAt = localIsoNow();
  return exercises.map((exercise) => ({ ...exercise, updatedAt }));
}

/**
 * Add the starter catalog entries the library doesn't have yet (matched by id).
 * Existing entries, including edited starter ones, are left as they are. The
 * added entries are stamped now, so they also win over earlier deletions when
 * synced. Returns how many entries were added.
 */
export async function importStarterExercises(): Promise<number> {
  const added = await appDb.transaction("rw", appDb.exercises, async () => {
    const existingIds = new Set(await appDb.exercises.toCollection().primaryKeys());
    const missing = exerciseCatalog.filter((exercise) => !existingIds.has(exercise.id));
    await appDb.exercises.bulkAdd(stamp(missing));
    return missing.length;
  });
  if (added > 0) scheduleSync();
  return added;
}

export async function listAllExercises(): Promise<ExerciseVideo[]> {
  return appDb.exercises.toArray();
}

export function getExerciseById(id: string): Promise<ExerciseVideo | undefined> {
  return appDb.exercises.get(id);
}

export async function addExercise(exercise: ExerciseDraft): Promise<string> {
  const id = await appDb.exercises.add(stamp([exercise])[0]);
  scheduleSync();
  return id;
}

export async function updateExercise(exercise: ExerciseDraft): Promise<string> {
  const id = await appDb.exercises.put(stamp([exercise])[0]);
  scheduleSync();
  return id;
}

export async function deleteExercise(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.exercises, appDb.tombstones, async () => {
    await appDb.exercises.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

export async function replaceAllExercises(exercises: ExerciseDraft[]): Promise<void> {
  await appDb.transaction("rw", appDb.exercises, appDb.tombstones, async () => {
    const keptIds = new Set(exercises.map((exercise) => exercise.id));
    const removedIds = (await appDb.exercises.toCollection().primaryKeys()).filter(
      (id) => !keptIds.has(id),
    );
    await appDb.exercises.clear();
    await appDb.exercises.bulkAdd(stamp(exercises));
    await recordTombstones(TOMBSTONE_TABLE, removedIds);
  });
  scheduleSync();
}

export async function clearAllExercises(): Promise<void> {
  await appDb.transaction("rw", appDb.exercises, appDb.tombstones, async () => {
    const ids = await appDb.exercises.toCollection().primaryKeys();
    await appDb.exercises.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  });
  scheduleSync();
}
