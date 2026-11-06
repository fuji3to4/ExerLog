import type { ExerciseSet, ExerciseVideo } from "@/lib/types";

import { toEntryKeys, type ListEntry } from "./list-entries";

/**
 * A set's exercises in the set's order, repeats included (each its own entry). Ids missing from the
 * library are skipped here at read time; deleting a video never rewrites sets.
 */
export function resolveSetExercises(set: ExerciseSet, exercises: ExerciseVideo[]): ListEntry[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const keys = toEntryKeys(set.exerciseIds);
  return set.exerciseIds.flatMap((id, index) => {
    const exercise = byId.get(id);
    return exercise ? [{ ...exercise, entryKey: keys[index] }] : [];
  });
}
