import { appDb } from "./app-db";
import {
  getDailyWellness,
  saveDailyWellness,
} from "./daily-wellness.repository";
import {
  listDailyMetricsByDate,
  replaceDailyMetrics,
} from "./daily-metrics.repository";
import {
  listDailySelfCareEntriesByDate,
  replaceDailySelfCareEntries,
} from "./daily-self-care.repository";

beforeEach(async () => {
  await Promise.all([
    appDb.dailyWellness.clear(),
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
  ]);
});

test("saveDailyWellness upserts one wellness entry per day", async () => {
  await saveDailyWellness({
    date: "2026-03-26",
    physicalScore: 2,
    mentalScore: 3,
  });

  await saveDailyWellness({
    date: "2026-03-26",
    physicalScore: 5,
    mentalScore: 4,
  });

  const entry = await getDailyWellness("2026-03-26");

  expect(entry).toEqual({
    date: "2026-03-26",
    physicalScore: 5,
    mentalScore: 4,
    updatedAt: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    ),
  });
});

test("replaceDailyMetrics replaces all metric rows for the same day", async () => {
  await replaceDailyMetrics("2026-03-27", [
    { metricType: "height", value: 171, unit: "cm" },
    { metricType: "weight", value: 62, unit: "kg" },
  ]);

  await replaceDailyMetrics("2026-03-27", [
    { metricType: "bodyFat", value: 18, unit: "%" },
  ]);

  const metrics = await listDailyMetricsByDate("2026-03-27");

  expect(metrics).toHaveLength(1);
  expect(metrics[0]).toMatchObject({
    date: "2026-03-27",
    metricType: "bodyFat",
    value: 18,
    unit: "%",
  });
  expect(metrics[0]?.id).toEqual(expect.any(String));
  expect(metrics[0]?.recordedAt).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
  );

  await replaceDailyMetrics("2026-03-27", []);

  expect(await listDailyMetricsByDate("2026-03-27")).toEqual([]);
});

test("replaceDailySelfCareEntries replaces all self-care rows for the same day", async () => {
  await replaceDailySelfCareEntries("2026-03-28", [
    {
      selfCareId: "stretching",
      isDone: true,
      count: null,
      minutes: 10,
      note: "",
    },
    {
      selfCareId: "meditation",
      isDone: false,
      count: null,
      minutes: null,
      note: "later",
    },
  ]);

  await replaceDailySelfCareEntries("2026-03-28", [
    {
      selfCareId: "walking",
      isDone: true,
      count: 1,
      minutes: 25,
      note: "",
    },
  ]);

  const entries = await listDailySelfCareEntriesByDate("2026-03-28");

  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    date: "2026-03-28",
    selfCareId: "walking",
    isDone: true,
    count: 1,
    minutes: 25,
    note: "",
  });
  expect(entries[0]?.id).toEqual(expect.any(String));
  expect(entries[0]?.recordedAt).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
  );

  await replaceDailySelfCareEntries("2026-03-28", []);

  expect(await listDailySelfCareEntriesByDate("2026-03-28")).toEqual([]);
});
