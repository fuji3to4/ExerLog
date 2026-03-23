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
