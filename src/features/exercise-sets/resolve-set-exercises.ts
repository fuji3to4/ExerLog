import type { ExerciseSet, ExerciseVideo } from "@/lib/types";

/**
 * A set's exercises in the set's order. Ids missing from the library are skipped here
 * at read time; deleting a video never rewrites sets.
 */
export function resolveSetExercises(set: ExerciseSet, exercises: ExerciseVideo[]): ExerciseVideo[] {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return set.exerciseIds.flatMap((id) => {
    const exercise = byId.get(id);
    return exercise ? [exercise] : [];
  });
}
