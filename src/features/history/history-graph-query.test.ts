import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import { replaceDailySelfCareEntries } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { addMeasurement } from "@/features/storage/measurements.repository";
import { addWellnessEntry } from "@/features/storage/wellness-entries.repository";

import { buildHistoryGraphSeries } from "./history-graph-query";

beforeEach(async () => {
  await Promise.all([
    appDb.measurements.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.selfCareCatalog.clear(),
  ]);

  await appDb.selfCareCatalog.bulkAdd(selfCareCatalog);
});

test("plots every weight record in the range as its own point, oldest first", async () => {
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T21:00:00+09:00", values: { weight: 60.9 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T07:12:00+09:00", values: { weight: 60.2 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T12:00:00+09:00", values: { weight: 60.6, bodyFat: 20 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T13:00:00+09:00", values: { bodyFat: 21 }, note: "" });
  await addMeasurement({ date: "2026-10-23", recordedAt: "2026-10-23T07:00:00+09:00", values: { weight: 61 }, note: "" });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-10-22", end: "2026-10-22" },
    metric: { kind: "measurement", itemId: "weight" },
  });

  expect(series).toEqual({
    unit: "kg",
    decimals: 1,
    points: [
      { at: "2026-10-22T07:12:00+09:00", value: 60.2 },
      { at: "2026-10-22T12:00:00+09:00", value: 60.6 },
      { at: "2026-10-22T21:00:00+09:00", value: 60.9 },
    ],
  });
});

test("orders points by instant, not by string, when offsets differ", async () => {
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T08:00:00+09:00", values: { weight: 60 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T07:00:00+00:00", values: { weight: 61 }, note: "" });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-10-22", end: "2026-10-22" },
    metric: { kind: "measurement", itemId: "weight" },
  });

  expect(series.points.map((point) => point.value)).toEqual([60, 61]);
});

test("plots every wellness entry as its own point instead of a daily average", async () => {
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T20:00:00+09:00", physicalScore: 4, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", physicalScore: 2, mentalScore: 3, note: "" });
  await addWellnessEntry({ date: "2026-10-15", recordedAt: "2026-10-15T08:00:00+09:00", physicalScore: 5, mentalScore: 5, note: "" });

  const physical = await buildHistoryGraphSeries({
    range: { start: "2026-10-16", end: "2026-10-20" },
    metric: { kind: "wellness", score: "physical" },
  });

  expect(physical).toEqual({
    unit: "/5",
    decimals: 0,
    points: [
      { at: "2026-10-20T08:00:00+09:00", value: 2 },
      { at: "2026-10-20T20:00:00+09:00", value: 4 },
    ],
  });

  const mental = await buildHistoryGraphSeries({
    range: { start: "2026-10-20", end: "2026-10-20" },
    metric: { kind: "wellness", score: "mental" },
  });

  expect(mental.points.map((point) => point.value)).toEqual([3, 5]);
});

test("builds BMI from each weight with the latest height recorded at or before it, even before the range", async () => {
  await addMeasurement({ date: "2026-10-01", recordedAt: "2026-10-01T09:00:00+09:00", values: { height: 170 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T07:12:00+09:00", values: { weight: 60 }, note: "" });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-10-22", end: "2026-10-22" },
    metric: { kind: "bmi" },
  });

  expect(series).toEqual({
    unit: "",
    decimals: 1,
    points: [{ at: "2026-10-22T07:12:00+09:00", value: 20.8 }],
  });
});

test("skips BMI points with no earlier height and switches height when a newer one is recorded", async () => {
  await addMeasurement({ date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", values: { weight: 62 }, note: "" });
  await addMeasurement({ date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", values: { height: 170 }, note: "" });
  await addMeasurement({ date: "2026-10-21", recordedAt: "2026-10-21T07:00:00+09:00", values: { weight: 60 }, note: "" });
  await addMeasurement({ date: "2026-10-22", recordedAt: "2026-10-22T07:00:00+09:00", values: { weight: 60, height: 160 }, note: "" });
  await addMeasurement({ date: "2026-10-25", recordedAt: "2026-10-25T07:00:00+09:00", values: { height: 150 }, note: "" });

  const series = await buildHistoryGraphSeries({
    range: { start: "2026-10-20", end: "2026-10-22" },
    metric: { kind: "bmi" },
  });

  expect(series.points).toEqual([
    { at: "2026-10-21T07:00:00+09:00", value: 20.8 },
    { at: "2026-10-22T07:00:00+09:00", value: 23.4 },
  ]);
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
    decimals: 0,
    points: [
      { at: "2026-03-22T00:00:00", value: 8 },
      { at: "2026-03-24T00:00:00", value: 0 },
    ],
  });
});
