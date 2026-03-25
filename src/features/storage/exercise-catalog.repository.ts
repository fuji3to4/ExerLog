import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import type { ExerciseVideo } from "@/lib/types";

import { appDb } from "./app-db";

export async function seedIfEmpty(): Promise<void> {
  const count = await appDb.exercises.count();
  if (count === 0) {
    await appDb.exercises.bulkAdd(exerciseCatalog);
  }
}

export async function listAllExercises(): Promise<ExerciseVideo[]> {
  await seedIfEmpty();
  return appDb.exercises.toArray();
}

export function getExerciseById(id: string): Promise<ExerciseVideo | undefined> {
  return appDb.exercises.get(id);
}

export function addExercise(exercise: ExerciseVideo): Promise<string> {
  return appDb.exercises.add(exercise);
}

export function updateExercise(exercise: ExerciseVideo): Promise<string> {
  return appDb.exercises.put(exercise);
}

export function deleteExercise(id: string): Promise<void> {
  return appDb.exercises.delete(id);
}

export function replaceAllExercises(exercises: ExerciseVideo[]): Promise<void> {
  return appDb.transaction("rw", appDb.exercises, async () => {
    await appDb.exercises.clear();
    await appDb.exercises.bulkAdd(exercises);
  });
}
