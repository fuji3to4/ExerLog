import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import type { ExerciseVideo } from "@/lib/types";

import { appDb } from "./app-db";
import { importStarterExercises, listAllExercises } from "./exercise-catalog.repository";

const customExercise: ExerciseVideo = {
  id: "custom-exercise",
  title: "Custom",
  description: "",
  videoUrl: "https://example.com/video",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 300,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
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

test("importStarterExercises adds the whole starter catalog to an empty store", async () => {
  const added = await importStarterExercises();

  expect(added).toBe(exerciseCatalog.length);
  expect(await appDb.exercises.count()).toBe(exerciseCatalog.length);
});

test("importStarterExercises adds only the missing starter entries and keeps edited ones", async () => {
  const [first, ...rest] = exerciseCatalog;
  const edited: ExerciseVideo = { ...first, title: "Edited", updatedAt: "2026-10-20T00:00:00+09:00" };
  await appDb.exercises.bulkAdd([edited, customExercise]);

  const added = await importStarterExercises();

  expect(added).toBe(rest.length);
  expect(await appDb.exercises.count()).toBe(exerciseCatalog.length + 1);
  expect((await appDb.exercises.get(first.id))?.title).toBe("Edited");
});

test("importStarterExercises stamps added entries so they win over earlier tombstones", async () => {
  await importStarterExercises();

  const stored = await appDb.exercises.get(exerciseCatalog[0].id);
  expect(stored?.updatedAt).toBeTruthy();
  expect(stored!.updatedAt > "2026-01-01").toBe(true);
});
