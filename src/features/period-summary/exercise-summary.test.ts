import { describe, expect, it } from "vitest";

import type { ExerciseLog } from "@/lib/types";
import { summarizeExercise } from "./exercise-summary";

function log(id: string, exerciseId: string, durationSeconds: number): ExerciseLog {
  return {
    id,
    date: "2026-10-20",
    exerciseId,
    result: "did",
    performedAt: "2026-10-20T09:00:00+09:00",
    durationSeconds,
    updatedAt: "2026-10-20T09:00:00+09:00",
  };
}

describe("summarizeExercise", () => {
  const titles = new Map([["a", "Squat"], ["b", "Arm"], ["c", "Roll"], ["d", "Bend"]]);

  it("ranks top 3 by count then title and totals seconds", () => {
    const logs = [
      log("1", "a", 60), log("2", "a", 60), log("3", "c", 30), log("4", "b", 30),
      log("5", "d", 30), log("6", "d", 30), log("7", "c", 30),
    ];
    expect(summarizeExercise(logs, titles)).toEqual({
      count: 7,
      totalSeconds: 270,
      top: [
        { title: "Bend", count: 2 },
        { title: "Roll", count: 2 },
        { title: "Squat", count: 2 },
      ],
    });
  });

  it("returns null for no logs", () => {
    expect(summarizeExercise([], titles)).toBeNull();
  });
});
