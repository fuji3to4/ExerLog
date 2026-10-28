import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { addCompressionRecord } from "./data";
import { COMPRESSION_GRAPH_METRICS } from "./graph";

beforeEach(async () => {
  await appDb.compressionRecords.clear();
});

const wear = (kind: "garment" | "bandage", start: string, end: string | null) =>
  addCompressionRecord({ kind, recordedAt: start, endedAt: end, note: "" });

test("offers garment and bandage", () => {
  expect(COMPRESSION_GRAPH_METRICS.map((m) => m.labelKey)).toEqual([
    "compression_kind_garment",
    "compression_kind_bandage",
  ]);
});

test("fills days without wear with 0 hours between the first and last wear day", async () => {
  await wear("garment", "2026-10-01T08:00:00+09:00", "2026-10-01T20:00:00+09:00");
  await wear("garment", "2026-10-03T08:00:00+09:00", "2026-10-03T14:30:00+09:00");
  await wear("garment", "2026-10-05T08:00:00+09:00", null);
  await wear("bandage", "2026-10-04T08:00:00+09:00", "2026-10-04T10:00:00+09:00");

  const series = await COMPRESSION_GRAPH_METRICS[0].load({ start: "2026-09-25", end: "2026-10-31" });

  expect(series.chart).toBe("bar");
  expect(series.unit).toBe("h");
  expect(series.decimals).toBe(1);
  expect(series.points.map((p) => p.at.slice(0, 10))).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  expect(series.points.map((p) => p.value)).toEqual([12, 0, 6.5]);
  expect(series.points[0].at.slice(11, 16)).toBe("12:00");
});

test("has no points when nothing is finished", async () => {
  await wear("garment", "2026-10-05T08:00:00+09:00", null);
  const series = await COMPRESSION_GRAPH_METRICS[0].load({ start: "2026-10-01", end: "2026-10-31" });
  expect(series.points).toEqual([]);
});
