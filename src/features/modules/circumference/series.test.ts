import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";

import { circumferenceRepository } from "./data";
import { buildCircumferenceSeries } from "./series";

beforeEach(async () => {
  await Promise.all([appDb.bodyRecords.clear(), appDb.circumferenceRecords.clear()]);
});

test("uses records before the range for deltas and returns only in-range points", async () => {
  await circumferenceRepository.add({ date: "2026-09-30", recordedAt: "2026-09-30T07:00:00+09:00", values: { armBelowElbowRight: 24.2 }, note: "" });
  await circumferenceRepository.add({ date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", values: { armBelowElbowRight: 24.5, armBelowElbowLeft: 22.4 }, note: "" });
  await circumferenceRepository.add({ date: "2026-10-25", recordedAt: "2026-10-25T07:00:00+09:00", values: { armBelowElbowRight: 25 }, note: "" });

  const points = await buildCircumferenceSeries({
    range: { start: "2026-10-01", end: "2026-10-22" },
    limb: "arm",
    site: "belowElbow",
  });

  expect(points).toEqual([
    { at: "2026-10-20T07:00:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 24.5 - 24.2 } },
  ]);
});

test("reads only circumference records", async () => {
  await appDb.bodyRecords.put({
    id: "b-stray",
    date: "2026-10-21",
    recordedAt: "2026-10-21T07:00:00+09:00",
    values: { weight: 60, armBelowElbowRight: 30 },
    note: "",
    updatedAt: "2026-10-21T07:00:00+09:00",
  });
  await appDb.circumferenceRecords.put({
    id: "c1",
    date: "2026-10-20",
    recordedAt: "2026-10-20T07:00:00+09:00",
    values: { armBelowElbowRight: 24.5 },
    note: "",
    updatedAt: "2026-10-20T07:00:00+09:00",
  });

  const points = await buildCircumferenceSeries({
    range: { start: "2026-10-01", end: "2026-10-31" },
    limb: "arm",
    site: "belowElbow",
  });
  expect(points.map((point) => point.at)).toEqual(["2026-10-20T07:00:00+09:00"]);
});
