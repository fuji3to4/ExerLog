import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";

import { addWellnessEntry } from "./data";
import { WELLNESS_GRAPH_METRICS } from "./graph";

beforeEach(async () => {
  await appDb.wellnessEntries.clear();
});

function metric(key: string) {
  return WELLNESS_GRAPH_METRICS.find((m) => m.key === key)!;
}

test("offers the body and mind scores", () => {
  expect(WELLNESS_GRAPH_METRICS.map((m) => m.labelKey)).toEqual([
    "history_graph_metric_physical",
    "history_graph_metric_mental",
  ]);
});

test("plots every wellness entry as its own point instead of a daily average", async () => {
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T20:00:00+09:00", physicalScore: 4, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", physicalScore: 2, mentalScore: 3, note: "" });
  await addWellnessEntry({ date: "2026-10-15", recordedAt: "2026-10-15T08:00:00+09:00", physicalScore: 5, mentalScore: 5, note: "" });

  const physical = await metric("physical").load({ start: "2026-10-16", end: "2026-10-20" });

  expect(physical).toEqual({
    unit: "/5",
    decimals: 0,
    points: [
      { at: "2026-10-20T08:00:00+09:00", value: 2 },
      { at: "2026-10-20T20:00:00+09:00", value: 4 },
    ],
  });

  const mental = await metric("mental").load({ start: "2026-10-20", end: "2026-10-20" });
  expect(mental.points.map((point) => point.value)).toEqual([3, 5]);
});
