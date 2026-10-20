import { beforeEach, expect, test } from "vitest";

import { appDb } from "./app-db";
import {
  findLatestHeightOnOrBefore,
  listMetricEntriesInRange,
  replaceDailyMetrics,
} from "./daily-metrics.repository";

beforeEach(async () => {
  await Promise.all([appDb.dailyMetrics.clear(), appDb.tombstones.clear()]);
});

test("findLatestHeightOnOrBefore picks the latest height on or before the date", async () => {
  await replaceDailyMetrics("2026-09-01", [{ metricType: "height", value: 168, unit: "cm" }]);
  await replaceDailyMetrics("2026-10-01", [
    { metricType: "height", value: 170, unit: "cm" },
    { metricType: "weight", value: 61, unit: "kg" },
  ]);
  await replaceDailyMetrics("2026-10-25", [{ metricType: "height", value: 171, unit: "cm" }]);

  await expect(findLatestHeightOnOrBefore("2026-10-20")).resolves.toBe(170);
  await expect(findLatestHeightOnOrBefore("2026-10-01")).resolves.toBe(170);
  await expect(findLatestHeightOnOrBefore("2026-09-15")).resolves.toBe(168);
  await expect(findLatestHeightOnOrBefore("2026-08-31")).resolves.toBeNull();
});

test("listMetricEntriesInRange returns one metric type, inclusive, sorted by date", async () => {
  await replaceDailyMetrics("2026-10-05", [{ metricType: "weight", value: 60, unit: "kg" }]);
  await replaceDailyMetrics("2026-10-01", [
    { metricType: "weight", value: 61, unit: "kg" },
    { metricType: "height", value: 170, unit: "cm" },
  ]);
  await replaceDailyMetrics("2026-10-10", [{ metricType: "weight", value: 59, unit: "kg" }]);
  await replaceDailyMetrics("2026-10-11", [{ metricType: "weight", value: 58, unit: "kg" }]);

  const entries = await listMetricEntriesInRange("weight", "2026-10-01", "2026-10-10");

  expect(entries.map((entry) => [entry.date, entry.value])).toEqual([
    ["2026-10-01", 61],
    ["2026-10-05", 60],
    ["2026-10-10", 59],
  ]);
});
