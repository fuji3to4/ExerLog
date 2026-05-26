import { describe, it, expect } from "vitest";
import {
  generateDailyMetricsCsv,
  generateDailyWellnessCsv,
  generateExerciseLogsCsv,
} from "./history-csv";
import type { DailyMetricEntry, DailyWellnessEntry, ExerciseLog } from "@/lib/types";

const makeLog = (overrides: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: "log1",
  date: "2024-01-15",
  exerciseId: "ex1",
  result: "did",
  loggedAt: "2024-01-15T09:00:00+09:00",
  ...overrides,
});

const makeWellness = (overrides: Partial<DailyWellnessEntry> = {}): DailyWellnessEntry => ({
  date: "2024-01-15",
  physicalScore: 4,
  mentalScore: 3,
  note: "Slept well",
  updatedAt: "2024-01-15T09:30:00+09:00",
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
  it("formats loggedAt as YYYY-MM-DD HH:MM", () => {
    const csv = generateExerciseLogsCsv([makeLog()], new Map([["ex1", "Push-ups"]]));
    expect(csv).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  it("handles empty string loggedAt gracefully", () => {
    const csv = generateExerciseLogsCsv(
      [makeLog({ loggedAt: "" })],
      new Map([["ex1", "Push-ups"]])
    );
    expect(csv).toContain("Push-ups");
  });
});

describe("generateDailyWellnessCsv", () => {
  it("includes daily wellness headers", () => {
    const csv = generateDailyWellnessCsv([makeWellness()]);
    expect(csv.split("\n")[0]).toBe("date,physicalScore,mentalScore,note,updatedAt");
  });

  it("formats updatedAt as YYYY-MM-DD HH:MM", () => {
    const csv = generateDailyWellnessCsv([makeWellness()]);
    expect(csv).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  it("handles empty string updatedAt gracefully", () => {
    const csv = generateDailyWellnessCsv([makeWellness({ updatedAt: "" })]);
    // Should not throw, should produce a CSV row
    expect(csv).toContain("Slept well");
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
    const csv = generateDailyMetricsCsv([makeMetric({ recordedAt: "" })]);
    expect(csv).toContain("weight");
  });
});
