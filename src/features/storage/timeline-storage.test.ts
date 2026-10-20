import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { scheduleSync } from "@/features/sync/auto-sync";

import { appDb } from "./app-db";
import { deleteDailyMetric, listDailyMetricsByDate, replaceDailyMetrics, upsertDailyMetric } from "./daily-metrics.repository";
import { replaceAllExercises } from "./exercise-catalog.repository";
import {
  addExerciseLog,
  countExerciseLogsForDay,
  deleteExerciseLog,
  listExerciseLogsForDay,
} from "./exercise-logs.repository";
import { listTombstones, recordTombstones } from "./tombstones.repository";
import { recordWatchEvent, listWatchEventsForDay, WATCH_DEDUPE_MS } from "./watch-events.repository";
import {
  addWellnessEntry,
  deleteWellnessEntry,
  getLatestWellnessEntry,
  listWellnessEntriesForDay,
} from "./wellness-entries.repository";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
    appDb.dailyMetrics.clear(),
    appDb.exercises.clear(),
  ]);
  vi.mocked(scheduleSync).mockClear();
});

test("addExerciseLog keeps multiple logs for the same exercise and day", async () => {
  const first = await addExerciseLog({
    date: "2026-10-20",
    exerciseId: "neck-mobility-5",
    result: "did",
    durationSeconds: 300,
  });
  await addExerciseLog({
    date: "2026-10-20",
    exerciseId: "neck-mobility-5",
    result: "partial",
    durationSeconds: 120,
  });

  expect(first.id).toEqual(expect.any(String));
  expect(first.performedAt).toMatch(/^2026-10-20T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  expect(await countExerciseLogsForDay("2026-10-20")).toEqual({ "neck-mobility-5": 2 });
  expect(await listExerciseLogsForDay("2026-10-20")).toHaveLength(2);
  expect(scheduleSync).toHaveBeenCalled();
});

test("deleteExerciseLog removes the log and records a tombstone", async () => {
  const log = await addExerciseLog({
    date: "2026-10-20",
    exerciseId: "neck-mobility-5",
    result: "did",
    durationSeconds: 300,
  });

  await deleteExerciseLog(log.id);

  expect(await listExerciseLogsForDay("2026-10-20")).toHaveLength(0);
  expect(await listTombstones()).toEqual([
    expect.objectContaining({ id: `ExerciseLogs:${log.id}`, table: "ExerciseLogs", recordId: log.id }),
  ]);
});

test("wellness entries are listed in time order and the latest one is returned", async () => {
  await addWellnessEntry({
    date: "2026-10-20",
    physicalScore: 4,
    mentalScore: 3,
    note: "  evening  ",
    recordedAt: "2026-10-20T22:30:00+09:00",
  });
  await addWellnessEntry({
    date: "2026-10-20",
    physicalScore: 2,
    mentalScore: 2,
    note: "morning",
    recordedAt: "2026-10-20T07:10:00+09:00",
  });

  const entries = await listWellnessEntriesForDay("2026-10-20");
  expect(entries.map((entry) => entry.recordedAt)).toEqual([
    "2026-10-20T07:10:00+09:00",
    "2026-10-20T22:30:00+09:00",
  ]);
  expect(entries[1]?.note).toBe("evening");

  const latest = await getLatestWellnessEntry("2026-10-20");
  expect(latest?.recordedAt).toBe("2026-10-20T22:30:00+09:00");
});

test("addWellnessEntry defaults recordedAt to the entry date", async () => {
  const entry = await addWellnessEntry({ date: "2026-10-01", physicalScore: 3, mentalScore: 3, note: "" });
  expect(entry.recordedAt.startsWith("2026-10-01T")).toBe(true);
});

test("recordWatchEvent skips watches of the same exercise within 10 minutes", async () => {
  expect(WATCH_DEDUPE_MS).toBe(600_000);

  const first = await recordWatchEvent({
    exerciseId: "neck-mobility-5",
    date: "2026-10-20",
    watchedAt: "2026-10-20T18:03:00+09:00",
  });
  expect(first).not.toBeNull();

  const duplicate = await recordWatchEvent({
    exerciseId: "neck-mobility-5",
    date: "2026-10-20",
    watchedAt: "2026-10-20T18:12:00+09:00",
  });
  expect(duplicate).toBeNull();

  const otherExercise = await recordWatchEvent({
    exerciseId: "shoulder-roll-3",
    date: "2026-10-20",
    watchedAt: "2026-10-20T18:12:00+09:00",
  });
  expect(otherExercise).not.toBeNull();

  const later = await recordWatchEvent({
    exerciseId: "neck-mobility-5",
    date: "2026-10-20",
    watchedAt: "2026-10-20T18:14:00+09:00",
  });
  expect(later).toEqual(expect.objectContaining({ exerciseId: "neck-mobility-5", watchedAt: "2026-10-20T18:14:00+09:00" }));

  expect(await listWatchEventsForDay("2026-10-20")).toHaveLength(3);
});

test("deleteWellnessEntry records a tombstone", async () => {
  const entry = await addWellnessEntry({ date: "2026-10-20", physicalScore: 3, mentalScore: 3, note: "" });

  await deleteWellnessEntry(entry.id);

  expect(await listWellnessEntriesForDay("2026-10-20")).toHaveLength(0);
  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ id: `WellnessEntries:${entry.id}`, table: "WellnessEntries", recordId: entry.id }),
  );
});

test("recordTombstones overwrites an existing tombstone and schedules sync", async () => {
  await recordTombstones("WatchEvents", ["a"]);
  await recordTombstones("WatchEvents", ["a"]);

  expect(await listTombstones()).toHaveLength(1);
  expect(scheduleSync).toHaveBeenCalled();
});

test("replaceDailyMetrics records tombstones for the removed ids", async () => {
  await replaceDailyMetrics("2026-10-20", [{ metricType: "weight", value: 62.4, unit: "kg" }]);
  const [before] = await listDailyMetricsByDate("2026-10-20");

  await replaceDailyMetrics("2026-10-20", [{ metricType: "weight", value: 61.8, unit: "kg" }]);

  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ id: `DailyMetrics:${before!.id}`, table: "DailyMetrics", recordId: before!.id }),
  );
});

test("deleteDailyMetric records a tombstone for the deleted id", async () => {
  await upsertDailyMetric("2026-10-20", { metricType: "weight", value: 62.4, unit: "kg" });
  const [metric] = await listDailyMetricsByDate("2026-10-20");

  await deleteDailyMetric("2026-10-20", "weight");

  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ id: `DailyMetrics:${metric!.id}`, table: "DailyMetrics" }),
  );
});

test("replaceAllExercises records tombstones only for exercises that disappear", async () => {
  const base = {
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    bodyArea: "neck",
    purpose: "stretch",
    durationSeconds: 300,
    intensity: "low" as const,
  };
  await replaceAllExercises([
    { ...base, id: "keep", title: "Keep" },
    { ...base, id: "drop", title: "Drop" },
  ]);

  await replaceAllExercises([{ ...base, id: "keep", title: "Keep" }]);

  const tombstones = await listTombstones();
  expect(tombstones.map((tombstone) => tombstone.id)).toEqual(["Exercises:drop"]);
});
