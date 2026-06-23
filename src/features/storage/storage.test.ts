import { describe, test, expect, beforeEach } from "vitest";
import {
  listExerciseLogsForDay,
  saveExerciseLog,
} from "./exercise-logs.repository";
import {
  getDailyCondition,
  saveDailyCondition,
} from "./daily-condition.repository";
import { appDb } from "./app-db";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.conditions.clear();
});

test("upserts one daily condition per day", async () => {
  await saveDailyCondition({
    date: "2026-03-23",
    conditionLevel: "okay",
    note: "",
  });
  await saveDailyCondition({
    date: "2026-03-23",
    conditionLevel: "tired",
    note: "legs feel heavy",
  });

  const entry = await getDailyCondition("2026-03-23");

  expect(entry?.conditionLevel).toBe("tired");
  expect(entry?.note).toBe("legs feel heavy");
  expect(entry?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test("stores one log result per exercise and day", async () => {
  await saveExerciseLog({
    date: "2026-03-24",
    exerciseId: "neck-mobility-5",
    result: "partial",
  });

  await saveExerciseLog({
    date: "2026-03-24",
    exerciseId: "neck-mobility-5",
    result: "did",
  });

  const logs = await listExerciseLogsForDay("2026-03-24");

  expect(logs).toHaveLength(1);
  expect(logs[0]?.result).toBe("did");
  expect(logs[0]?.loggedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test("replaces same-day exercise logs without duplicate rows under concurrent saves", async () => {
  const results = await Promise.allSettled([
    saveExerciseLog({
      date: "2026-03-25",
      exerciseId: "neck-mobility-5",
      result: "partial",
    }),
    saveExerciseLog({
      date: "2026-03-25",
      exerciseId: "neck-mobility-5",
      result: "did",
    }),
  ]);

  expect(results.every((result) => result.status === "fulfilled")).toBe(true);

  const logs = await listExerciseLogsForDay("2026-03-25");

  expect(logs).toHaveLength(1);
  expect(logs[0]?.result).toBe("did");
});

describe("googleAuth table", () => {
  beforeEach(async () => {
    await appDb.googleAuth.clear();
  });

  test("stores and retrieves key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "test_key", value: "test_value" });
    const result = await appDb.googleAuth.get("test_key");
    expect(result?.value).toBe("test_value");
  });

  test("deletes key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "to_delete", value: "data" });
    await appDb.googleAuth.delete("to_delete");
    const result = await appDb.googleAuth.get("to_delete");
    expect(result).toBeUndefined();
  });
});
