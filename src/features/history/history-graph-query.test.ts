import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import { replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import { replaceDailySelfCareEntries } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { addWellnessEntry } from "@/features/storage/wellness-entries.repository";

import { buildHistoryGraphSeries } from "./history-graph-query";

beforeEach(async () => {
  await Promise.all([
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.selfCareCatalog.clear(),
  ]);

  await appDb.selfCareCatalog.bulkAdd(selfCareCatalog);
});

test("builds a weight metric series within the requested date range", async () => {
  await replaceDailyMetrics("2026-03-19", [{ metricType: "weight", value: 62.4, unit: "kg" }]);
  await replaceDailyMetrics("2026-03-21", [
    { metricType: "weight", value: 62.1, unit: "kg" },
    { metricType: "height", value: 171, unit: "cm" },
  ]);
  await replaceDailyMetrics("2026-03-23", [{ metricType: "weight", value: 61.8, unit: "kg" }]);
  await replaceDailyMetrics("2026-03-25", [{ metricType: "weight", value: 61.5, unit: "kg" }]);

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-03-20", end: "2026-03-24" },
    metric: { kind: "metric", metricType: "weight" },
  });

  expect(series).toEqual({
    unit: "kg",
    points: [
      { date: "2026-03-21", value: 62.1 },
      { date: "2026-03-23", value: 61.8 },
    ],
  });
});

test("averages wellness entries per day within the range", async () => {
  await addWellnessEntry({ date: "2026-10-20", physicalScore: 2, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", physicalScore: 4, mentalScore: 4, note: "" });
  await addWellnessEntry({ date: "2026-10-18", physicalScore: 3, mentalScore: 1, note: "" });
  await addWellnessEntry({ date: "2026-10-15", physicalScore: 5, mentalScore: 5, note: "" });

  const physical = await buildHistoryGraphSeries({
    range: { start: "2026-10-16", end: "2026-10-20" },
    metric: { kind: "wellness", score: "physical" },
  });

  expect(physical).toEqual({
    unit: "/5",
    points: [
      { date: "2026-10-18", value: 3 },
      { date: "2026-10-20", value: 3 },
    ],
  });

  const mental = await buildHistoryGraphSeries({
    range: { start: "2026-10-20", end: "2026-10-20" },
    metric: { kind: "wellness", score: "mental" },
  });

  expect(mental.points).toEqual([{ date: "2026-10-20", value: 4.5 }]);
});

test("rounds a per-day wellness average to one decimal", async () => {
  await addWellnessEntry({ date: "2026-10-20", physicalScore: 1, mentalScore: 3, note: "" });
  await addWellnessEntry({ date: "2026-10-20", physicalScore: 1, mentalScore: 3, note: "" });
  await addWellnessEntry({ date: "2026-10-20", physicalScore: 2, mentalScore: 3, note: "" });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-10-20", end: "2026-10-20" },
    metric: { kind: "wellness", score: "physical" },
  });

  expect(series.points).toEqual([{ date: "2026-10-20", value: 1.3 }]);
});

test("builds a BMI series from weights using the latest height on or before each day", async () => {
  await replaceDailyMetrics("2026-10-01", [{ metricType: "height", value: 170, unit: "cm" }]);
  await replaceDailyMetrics("2026-10-20", [{ metricType: "weight", value: 60, unit: "kg" }]);
  await replaceDailyMetrics("2026-09-30", [{ metricType: "weight", value: 62, unit: "kg" }]);

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-09-01", end: "2026-10-31" },
    metric: { kind: "bmi" },
  });

  expect(series).toEqual({
    unit: "",
    points: [{ date: "2026-10-20", value: 20.8 }],
  });
});

test("builds a self-care minutes series for a specific self-care item", async () => {
  await replaceDailySelfCareEntries("2026-03-20", [
    {
      selfCareId: "stretching",
      isDone: true,
      count: 1,
      minutes: 12,
      note: "",
    },
  ]);
  await replaceDailySelfCareEntries("2026-03-22", [
    {
      selfCareId: "walking",
      isDone: true,
      count: 1,
      minutes: 25,
      note: "",
    },
    {
      selfCareId: "stretching",
      isDone: true,
      count: 1,
      minutes: 8,
      note: "",
    },
  ]);
  await replaceDailySelfCareEntries("2026-03-24", [
    {
      selfCareId: "stretching",
      isDone: false,
      count: null,
      minutes: null,
      note: "Skipped today",
    },
  ]);

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-03-21", end: "2026-03-24" },
    metric: { kind: "selfCare", selfCareId: "stretching", measure: "minutes" },
  });

  expect(series).toEqual({
    unit: "",
    points: [
      { date: "2026-03-22", value: 8 },
      { date: "2026-03-24", value: 0 },
    ],
  });
});
