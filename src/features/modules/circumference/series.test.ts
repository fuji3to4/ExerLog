import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";

import { circumferenceRepository } from "./data";
import { buildCircumferenceSeries } from "./series";

beforeEach(async () => {
  await appDb.circumferenceRecords.clear();
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
