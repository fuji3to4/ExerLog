import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import { replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import { replaceDailySelfCareEntries } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { saveDailyWellness } from "@/features/storage/daily-wellness.repository";

import { buildHistoryGraphSeries } from "./history-graph-query";

beforeEach(async () => {
  await Promise.all([
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.dailyWellness.clear(),
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
    label: "Weight",
    unit: "kg",
    points: [
      { date: "2026-03-21", value: 62.1 },
      { date: "2026-03-23", value: 61.8 },
    ],
  });
});

test("builds a physical wellness score series over a date range", async () => {
  await saveDailyWellness({
    date: "2026-03-24",
    physicalScore: 2,
    mentalScore: 5,
    note: "",
  });
  await saveDailyWellness({
    date: "2026-03-22",
    physicalScore: 4,
    mentalScore: 1,
    note: "",
  });
  await saveDailyWellness({
    date: "2026-03-20",
    physicalScore: 3,
    mentalScore: 2,
    note: "",
  });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-03-21", end: "2026-03-24" },
    metric: { kind: "wellness", score: "physical" },
  });

  expect(series).toEqual({
    label: "Physical wellness",
    unit: "/5",
    points: [
      { date: "2026-03-22", value: 4 },
      { date: "2026-03-24", value: 2 },
    ],
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
    label: "ストレッチ",
    unit: "minutes",
    points: [
      { date: "2026-03-22", value: 8 },
      { date: "2026-03-24", value: 0 },
    ],
  });
});
