import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { bodyRepository } from "@/features/modules/body/data";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { appDb } from "@/features/storage/app-db";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";

import { listCalendarMarksInMonth } from "./history-query";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.bodyRecords.clear(),
  ]);
});

test("a disabled module does not mark its days", async () => {
  await bodyRepository.add({ date: "2026-10-05", values: { weight: 60 }, note: "" });
  await addWellnessEntry({ date: "2026-10-06", physicalScore: 3, mentalScore: 3, note: "" });

  expect(await listCalendarMarksInMonth("2026-10", ["wellness", "body"])).toEqual({
    "2026-10-05": "record",
    "2026-10-06": "record",
  });
  expect(await listCalendarMarksInMonth("2026-10", ["wellness"])).toEqual({ "2026-10-06": "record" });
  expect(await listCalendarMarksInMonth("2026-10", [])).toEqual({});
});

test("exercise wins over a record on the same day", async () => {
  await bodyRepository.add({ date: "2026-10-05", values: { weight: 60 }, note: "" });
  await addExerciseLog({ date: "2026-10-05", exerciseId: "a", result: "did", durationSeconds: 60 });
  expect(await listCalendarMarksInMonth("2026-10", ["body"])).toEqual({ "2026-10-05": "exercise" });
});
