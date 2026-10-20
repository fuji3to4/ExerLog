import { describe, it, expect } from "vitest";
import {
  generateDailyMetricsCsv,
  generateExerciseLogsCsv,
  generateWatchEventsCsv,
  generateWellnessEntriesCsv,
} from "./history-csv";
import type { DailyMetricEntry, ExerciseLog, WatchEvent, WellnessEntry } from "@/lib/types";

const makeLog = (overrides: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: "log1",
  date: "2024-01-15",
  exerciseId: "ex1",
  result: "did",
  performedAt: "2024-01-15T09:00:00+09:00",
  durationSeconds: 330,
  updatedAt: "2024-01-15T09:00:00+09:00",
  ...overrides,
});

const makeWellness = (overrides: Partial<WellnessEntry> = {}): WellnessEntry => ({
  id: "w1",
  date: "2024-01-15",
  recordedAt: "2024-01-15T09:30:00+09:00",
  physicalScore: 4,
  mentalScore: 3,
  note: "Slept well",
  updatedAt: "2024-01-15T09:30:00+09:00",
  ...overrides,
});

const makeWatch = (overrides: Partial<WatchEvent> = {}): WatchEvent => ({
  id: "v1",
  date: "2024-01-15",
  exerciseId: "ex1",
  watchedAt: "2024-01-15T10:00:00+09:00",
  updatedAt: "2024-01-15T10:00:00+09:00",
  ...overrides,
});

const makeMetric = (overrides: Partial<DailyMetricEntry> = {}): DailyMetricEntry => ({
  id: "metric1",
  date: "2024-01-15",
  metricType: "weight",
  value: 62.4,
  unit: "kg",
  recordedAt: "2024-01-15T07:10:00+09:00",
  ...overrides,
});

describe("generateExerciseLogsCsv", () => {
  it("has the expected headers", () => {
    const csv = generateExerciseLogsCsv([makeLog()], new Map());
    expect(csv.split("\n")[0]).toBe("date,performedAt,exerciseId,exerciseTitle,result,durationSeconds");
  });

  it("outputs durationSeconds as raw seconds, title and formatted time", () => {
    const row = generateExerciseLogsCsv([makeLog()], new Map([["ex1", "Push-ups"]])).split("\n")[1];
    expect(row).toMatch(/^2024-01-15,\d{4}-\d{2}-\d{2} \d{2}:\d{2},ex1,Push-ups,did,330$/);
  });

  it("handles empty performedAt gracefully", () => {
    const csv = generateExerciseLogsCsv([makeLog({ performedAt: "" })], new Map([["ex1", "Push-ups"]]));
    expect(csv).toContain("Push-ups");
  });
});

describe("generateWellnessEntriesCsv", () => {
  it("has the expected headers", () => {
    expect(generateWellnessEntriesCsv([makeWellness()]).split("\n")[0]).toBe(
      "date,recordedAt,physicalScore,mentalScore,note",
    );
  });

  it("formats recordedAt as YYYY-MM-DD HH:MM", () => {
    expect(generateWellnessEntriesCsv([makeWellness()])).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  it("handles empty recordedAt gracefully", () => {
    expect(generateWellnessEntriesCsv([makeWellness({ recordedAt: "" })])).toContain("Slept well");
  });
});

describe("generateWatchEventsCsv", () => {
  it("has the expected headers and falls back to the id for unknown titles", () => {
    const lines = generateWatchEventsCsv([makeWatch()], new Map()).split("\n");
    expect(lines[0]).toBe("date,watchedAt,exerciseId,exerciseTitle");
    expect(lines[1]).toMatch(/^2024-01-15,\d{4}-\d{2}-\d{2} \d{2}:\d{2},ex1,ex1$/);
  });

  it("uses the exercise title when known", () => {
    expect(generateWatchEventsCsv([makeWatch()], new Map([["ex1", "Squats"]]))).toContain(",ex1,Squats");
  });
});

describe("generateDailyMetricsCsv", () => {
  it("includes daily metrics headers", () => {
    const csv = generateDailyMetricsCsv([makeMetric()]);
    expect(csv.split("\n")[0]).toBe("date,metricType,value,unit,recordedAt");
  });

  it("outputs metric type, value, and unit", () => {
    const csv = generateDailyMetricsCsv([makeMetric()]);
    expect(csv).toContain("weight");
    expect(csv).toContain("62.4");
    expect(csv).toContain("kg");
  });

  it("handles empty recordedAt gracefully", () => {
    expect(generateDailyMetricsCsv([makeMetric({ recordedAt: "" })])).toContain("weight");
  });
});
