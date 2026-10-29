import { expect, test } from "vitest";

import type { ExerciseVideo } from "@/lib/types";

import { resolveSetExercises } from "./resolve-set-exercises";

function video(id: string): ExerciseVideo {
  return {
    id,
    title: id,
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationSeconds: 60,
    intensity: "low",
    updatedAt: "",
  };
}

test("keeps the set's order and skips ids missing from the library", () => {
  const set = { id: "s", name: "朝用", exerciseIds: ["c", "gone", "a"], createdAt: "", updatedAt: "" };
  expect(resolveSetExercises(set, [video("a"), video("b"), video("c")]).map((e) => e.id)).toEqual(["c", "a"]);
});

test("de-duplicates repeated ids, keeping the first occurrence", () => {
  const set = { id: "s", name: "x", exerciseIds: ["a", "b", "a", "b", "c"], createdAt: "", updatedAt: "" };
  expect(resolveSetExercises(set, [video("a"), video("b"), video("c")]).map((e) => e.id)).toEqual(["a", "b", "c"]);
});
