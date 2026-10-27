import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";

import { bodyRepository } from "./data";
import { BODY_GRAPH_METRICS } from "./graph";

beforeEach(async () => {
  await Promise.all([appDb.bodyRecords.clear(), appDb.circumferenceRecords.clear()]);
});

function metric(key: string) {
  return BODY_GRAPH_METRICS.find((m) => m.key === key)!;
}

const add = (recordedAt: string, values: Record<string, number>) =>
  bodyRepository.add({ date: recordedAt.slice(0, 10), recordedAt, values, note: "" });

test("offers weight, body fat, height and BMI in that order", () => {
  expect(BODY_GRAPH_METRICS.map((m) => m.labelKey)).toEqual([
    "measurement_item_weight",
    "measurement_item_body_fat",
    "measurement_item_height",
    "history_graph_metric_bmi",
  ]);
});

test("plots every weight record in the range as its own point, oldest first", async () => {
  await add("2026-10-22T21:00:00+09:00", { weight: 60.9 });
  await add("2026-10-22T07:12:00+09:00", { weight: 60.2 });
  await add("2026-10-22T12:00:00+09:00", { weight: 60.6, bodyFat: 20 });
  await add("2026-10-22T13:00:00+09:00", { bodyFat: 21 });
  await add("2026-10-23T07:00:00+09:00", { weight: 61 });

  const series = await metric("weight").load({ start: "2026-10-22", end: "2026-10-22" });

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
  await add("2026-10-22T08:00:00+09:00", { weight: 60 });
  await add("2026-10-22T07:00:00+00:00", { weight: 61 });

  const series = await metric("weight").load({ start: "2026-10-22", end: "2026-10-22" });

  expect(series.points.map((point) => point.value)).toEqual([60, 61]);
});

test("builds BMI from each weight with the latest height recorded at or before it, even before the range", async () => {
  await add("2026-10-01T09:00:00+09:00", { height: 170 });
  await add("2026-10-22T07:12:00+09:00", { weight: 60 });

  const series = await metric("bmi").load({ start: "2026-10-22", end: "2026-10-22" });

  expect(series).toEqual({ unit: "", decimals: 1, points: [{ at: "2026-10-22T07:12:00+09:00", value: 20.8 }] });
});

test("skips BMI points with no earlier height and switches height when a newer one is recorded", async () => {
  await add("2026-10-20T07:00:00+09:00", { weight: 62 });
  await add("2026-10-20T08:00:00+09:00", { height: 170 });
  await add("2026-10-21T07:00:00+09:00", { weight: 60 });
  await add("2026-10-22T07:00:00+09:00", { weight: 60, height: 160 });
  await add("2026-10-25T07:00:00+09:00", { height: 150 });

  const series = await metric("bmi").load({ start: "2026-10-20", end: "2026-10-22" });

  expect(series.points).toEqual([
    { at: "2026-10-21T07:00:00+09:00", value: 20.8 },
    { at: "2026-10-22T07:00:00+09:00", value: 23.4 },
  ]);
});

test("reads only body records", async () => {
  await appDb.circumferenceRecords.put({
    id: "c-stray",
    date: "2026-10-20",
    recordedAt: "2026-10-20T07:00:00+09:00",
    values: { weight: 99 },
    note: "",
    updatedAt: "2026-10-20T07:00:00+09:00",
  });
  await add("2026-10-21T07:00:00+09:00", { weight: 60 });

  const weight = await metric("weight").load({ start: "2026-10-01", end: "2026-10-31" });
  expect(weight.points).toEqual([{ at: "2026-10-21T07:00:00+09:00", value: 60 }]);
});
