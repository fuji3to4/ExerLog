import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import type { ExerciseVideo } from "@/lib/types";

import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "Exercises";

export async function seedIfEmpty(): Promise<void> {
  const count = await appDb.exercises.count();
  if (count === 0) {
    await appDb.exercises.bulkAdd(exerciseCatalog);
  }
}

export async function listAllExercises(): Promise<ExerciseVideo[]> {
  return appDb.exercises.toArray();
}

export function getExerciseById(id: string): Promise<ExerciseVideo | undefined> {
  return appDb.exercises.get(id);
}

export async function addExercise(exercise: ExerciseVideo): Promise<string> {
  const id = await appDb.exercises.add(exercise);
  scheduleSync();
  return id;
}

export async function updateExercise(exercise: ExerciseVideo): Promise<string> {
  const id = await appDb.exercises.put(exercise);
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

export async function replaceAllExercises(exercises: ExerciseVideo[]): Promise<void> {
  await appDb.transaction("rw", appDb.exercises, appDb.tombstones, async () => {
    const keptIds = new Set(exercises.map((exercise) => exercise.id));
    const removedIds = (await appDb.exercises.toCollection().primaryKeys()).filter(
      (id) => !keptIds.has(id),
    );
    await appDb.exercises.clear();
    await appDb.exercises.bulkAdd(exercises);
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
