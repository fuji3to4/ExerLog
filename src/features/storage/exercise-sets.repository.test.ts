import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { scheduleSync } from "@/features/sync/auto-sync";

import { appDb } from "./app-db";
import {
  addExerciseToSet,
  createExerciseSet,
  deleteExerciseSet,
  listExerciseSets,
  removeSetEntry,
  renameExerciseSet,
  reorderExerciseSet,
  setExerciseInSet,
} from "./exercise-sets.repository";

beforeEach(async () => {
  await appDb.exerciseSets.clear();
  await appDb.tombstones.clear();
  vi.mocked(scheduleSync).mockClear();
});

test("createExerciseSet trims the name, stamps times and schedules sync", async () => {
  const set = await createExerciseSet("  朝用 ", ["a"]);
  expect(set.name).toBe("朝用");
  expect(set.exerciseIds).toEqual(["a"]);
  expect(set.createdAt).not.toBe("");
  expect(set.updatedAt).not.toBe("");
  expect(await appDb.exerciseSets.get(set.id)).toEqual(set);
  expect(scheduleSync).toHaveBeenCalled();
});

test("blank names are rejected on create and rename", async () => {
  await expect(createExerciseSet("   ")).rejects.toThrow();
  const set = await createExerciseSet("x");
  await expect(renameExerciseSet(set.id, " ")).rejects.toThrow();
});

test("renameExerciseSet trims and stamps updatedAt", async () => {
  const set = await createExerciseSet("x");
  vi.mocked(scheduleSync).mockClear();
  await renameExerciseSet(set.id, " 夜用 ");
  expect((await appDb.exerciseSets.get(set.id))?.name).toBe("夜用");
  expect(scheduleSync).toHaveBeenCalled();
});

test("renameExerciseSet on an unknown id is a silent no-op", async () => {
  await renameExerciseSet("nope", "x");
  expect(await appDb.exerciseSets.count()).toBe(0);
  expect(scheduleSync).not.toHaveBeenCalled();
});

test("listExerciseSets returns oldest first", async () => {
  await appDb.exerciseSets.bulkAdd([
    { id: "late", name: "late", exerciseIds: [], createdAt: "2026-02-01T00:00:00", updatedAt: "" },
    { id: "early", name: "early", exerciseIds: [], createdAt: "2026-01-01T00:00:00", updatedAt: "" },
  ]);
  expect((await listExerciseSets()).map((s) => s.id)).toEqual(["early", "late"]);
});

test("setExerciseInSet appends without duplicates and removes", async () => {
  const set = await createExerciseSet("s", ["a"]);
  await setExerciseInSet(set.id, "b", true);
  await setExerciseInSet(set.id, "b", true);
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["a", "b"]);
  await setExerciseInSet(set.id, "a", false);
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["b"]);
});

test("setExerciseInSet on an unknown id is a silent no-op", async () => {
  await setExerciseInSet("nope", "a", true);
  expect(await appDb.exerciseSets.count()).toBe(0);
  expect(scheduleSync).not.toHaveBeenCalled();
});

test("deleteExerciseSet removes the row and records a tombstone", async () => {
  const set = await createExerciseSet("s");
  await deleteExerciseSet(set.id);
  expect(await appDb.exerciseSets.get(set.id)).toBeUndefined();
  expect(await appDb.tombstones.where("table").equals("ExerciseSets").count()).toBe(1);
});

test("reorderExerciseSet replaces the order, stamps updatedAt and schedules sync", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0, 0));
    const set = await createExerciseSet("朝", ["a", "b"]);
    vi.mocked(scheduleSync).mockClear();
    vi.setSystemTime(new Date(2026, 10, 6, 9, 5, 0));
    await reorderExerciseSet(set.id, ["b", "a"]);
    const [saved] = await listExerciseSets();
    expect(saved.exerciseIds).toEqual(["b", "a"]);
    expect(saved.updatedAt > set.updatedAt).toBe(true);
    expect(scheduleSync).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

test("reorderExerciseSet on an unknown set is a silent no-op", async () => {
  await expect(reorderExerciseSet("missing", ["a"])).resolves.toBeUndefined();
  expect(scheduleSync).not.toHaveBeenCalled();
});

test("addExerciseToSet appends a repeat and schedules sync", async () => {
  const set = await createExerciseSet("x", ["a", "b"]);
  vi.mocked(scheduleSync).mockClear();
  await addExerciseToSet(set.id, "a");
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["a", "b", "a"]);
  expect(scheduleSync).toHaveBeenCalled();
});

test("removeSetEntry removes only that occurrence, counting missing ids too", async () => {
  const set = await createExerciseSet("x", ["gone", "a", "b", "a"]);
  await removeSetEntry(set.id, "a#2");
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["gone", "a", "b"]);
  await removeSetEntry(set.id, "a");
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["gone", "b"]);
});

test("unchecking removes every copy", async () => {
  const set = await createExerciseSet("x", ["a", "b", "a"]);
  await setExerciseInSet(set.id, "a", false);
  expect((await appDb.exerciseSets.get(set.id))?.exerciseIds).toEqual(["b"]);
});

test("add and remove on an unknown set are no-ops", async () => {
  await addExerciseToSet("nope", "a");
  await removeSetEntry("nope", "a");
  expect(scheduleSync).not.toHaveBeenCalled();
});
