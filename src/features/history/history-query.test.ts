import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { addBuiltinRecord } from "@/test/builtin-records";

import { listCalendarMarksInMonth } from "./history-query";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.customRecords.clear(),
    appDb.watchEvents.clear(),
  ]);
});

test("a disabled module does not mark its days", async () => {
  await addBuiltinRecord("body", { date: "2026-10-05", values: { weight: 60 } });
  await addBuiltinRecord("wellness", { date: "2026-10-06", values: { physical: 3, mental: 3 } });

  expect(await listCalendarMarksInMonth("2026-10", ["wellness", "body"])).toEqual({
    "2026-10-05": "record",
    "2026-10-06": "record",
  });
  expect(await listCalendarMarksInMonth("2026-10", ["wellness"])).toEqual({ "2026-10-06": "record" });
  expect(await listCalendarMarksInMonth("2026-10", [])).toEqual({});
});

test("exercise wins over a record on the same day", async () => {
  await addBuiltinRecord("body", { date: "2026-10-05", values: { weight: 60 } });
  await addExerciseLog({ date: "2026-10-05", exerciseId: "a", result: "did", durationSeconds: 60 });
  expect(await listCalendarMarksInMonth("2026-10", ["body"])).toEqual({ "2026-10-05": "exercise" });
});
