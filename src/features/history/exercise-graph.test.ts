import { describe, expect, it } from "vitest";

import type { ExerciseLog } from "@/lib/types";

import { buildExerciseGraph, TOP_EXERCISES } from "./exercise-graph";
import { ALL_TIME_START } from "./range-presets";

function log(exerciseId: string, date: string, durationSeconds = 60): ExerciseLog {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    date,
    result: "did",
    durationSeconds,
    performedAt: `${date}T09:00:00+09:00`,
    updatedAt: `${date}T09:00:00+09:00`,
  };
}

const titles = new Map([
  ["a", "肩回し"],
  ["b", "ウォーキング"],
]);

describe("buildExerciseGraph", () => {
  it("returns nothing when there are no logs", () => {
    expect(buildExerciseGraph([], titles, { start: "2026-11-01", end: "2026-11-07" }, "count")).toEqual({
      perExercise: [],
      daily: [],
    });
  });

  it("counts per exercise (most first) and per day, filling days without logs with 0", () => {
    const logs = [log("a", "2026-11-02"), log("b", "2026-11-02"), log("b", "2026-11-04")];
    const graph = buildExerciseGraph(logs, titles, { start: "2026-11-01", end: "2026-11-05" }, "count");

    expect(graph.perExercise).toEqual([
      { title: "ウォーキング", value: 2 },
      { title: "肩回し", value: 1 },
    ]);
    expect(graph.daily.map((point) => [point.at.slice(0, 10), point.value])).toEqual([
      ["2026-11-01", 0],
      ["2026-11-02", 2],
      ["2026-11-03", 0],
      ["2026-11-04", 1],
      ["2026-11-05", 0],
    ]);
  });

  it("sums minutes when measuring time", () => {
    const logs = [log("a", "2026-11-02", 180), log("a", "2026-11-02", 120), log("b", "2026-11-03", 600)];
    const graph = buildExerciseGraph(logs, titles, { start: "2026-11-02", end: "2026-11-03" }, "minutes");

    expect(graph.perExercise).toEqual([
      { title: "ウォーキング", value: 10 },
      { title: "肩回し", value: 5 },
    ]);
    expect(graph.daily.map((point) => point.value)).toEqual([5, 10]);
  });

  it("starts the all-time series at the first log", () => {
    const logs = [log("a", "2026-10-30"), log("a", "2026-11-01")];
    const graph = buildExerciseGraph(logs, titles, { start: ALL_TIME_START, end: "2026-11-01" }, "count");

    expect(graph.daily.map((point) => point.at.slice(0, 10))).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("keeps only the top exercises and shows unknown ids as themselves", () => {
    const logs = Array.from({ length: TOP_EXERCISES + 2 }, (_, index) => log(`x${index}`, "2026-11-01"));
    logs.push(log("x0", "2026-11-01"));
    const graph = buildExerciseGraph(logs, new Map(), { start: "2026-11-01", end: "2026-11-01" }, "count");

    expect(graph.perExercise).toHaveLength(TOP_EXERCISES);
    expect(graph.perExercise[0]).toEqual({ title: "x0", value: 2 });
  });
});
