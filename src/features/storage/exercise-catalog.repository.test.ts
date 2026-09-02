import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import type { ExerciseVideo } from "@/lib/types";

import { appDb } from "./app-db";
import { listAllExercises, seedIfEmpty } from "./exercise-catalog.repository";

const customExercise: ExerciseVideo = {
  id: "custom-exercise",
  title: "Custom",
  description: "",
  videoUrl: "https://example.com/video",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationMinutes: 5,
  intensity: "low",
};

beforeEach(async () => {
  await appDb.exercises.clear();
});

test("listAllExercises returns an empty list without seeding when the store is empty", async () => {
  const result = await listAllExercises();

  expect(result).toEqual([]);
  expect(await appDb.exercises.count()).toBe(0);
});

test("listAllExercises returns stored exercises without seeding", async () => {
  await appDb.exercises.add(customExercise);

  const result = await listAllExercises();

  expect(result).toEqual([customExercise]);
});

test("seedIfEmpty seeds the catalog when the store is empty", async () => {
  await seedIfEmpty();

  expect(await appDb.exercises.count()).toBe(exerciseCatalog.length);
});

test("seedIfEmpty does not overwrite existing data", async () => {
  await appDb.exercises.add(customExercise);

  await seedIfEmpty();

  expect(await appDb.exercises.count()).toBe(1);
});
