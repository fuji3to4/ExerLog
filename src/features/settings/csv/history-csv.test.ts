import { describe, it, expect } from "vitest";
import { generateExerciseLogsCsv, generateConditionsCsv } from "./history-csv";
import type { ExerciseLog, DailyConditionEntry } from "@/lib/types";

const makeLog = (overrides: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: "log1",
  date: "2024-01-15",
  exerciseId: "ex1",
  result: "did",
  loggedAt: "2024-01-15T09:00:00+09:00",
  ...overrides,
});

const makeCondition = (overrides: Partial<DailyConditionEntry> = {}): DailyConditionEntry => ({
  date: "2024-01-15",
  conditionLevel: "good",
  note: "Felt great",
  updatedAt: "2024-01-15T09:30:00+09:00",
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

describe("generateConditionsCsv", () => {
  it("formats updatedAt as YYYY-MM-DD HH:MM", () => {
    const csv = generateConditionsCsv([makeCondition()]);
    expect(csv).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  it("handles empty string updatedAt gracefully", () => {
    const csv = generateConditionsCsv([makeCondition({ updatedAt: "" })]);
    // Should not throw, should produce a CSV row
    expect(csv).toContain("good");
  });
});
