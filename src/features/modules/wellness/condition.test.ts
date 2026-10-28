import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { appDb } from "@/features/storage/app-db";

import { getLatestConditionScores } from "./condition";
import { addWellnessEntry } from "./data";

beforeEach(async () => {
  await appDb.wellnessEntries.clear();
});

test("returns null when the day has no wellness entry", async () => {
  expect(await getLatestConditionScores("2026-10-20")).toBeNull();
});

test("returns the scores of the latest entry of the day", async () => {
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", physicalScore: 5, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T19:00:00+09:00", physicalScore: 1, mentalScore: 2, note: "x" });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 1, mentalScore: 2 });
});
