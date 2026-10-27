import { afterEach, expect, test, vi } from "vitest";

import { getMessages } from "@/features/i18n/messages";
import { generateMeasurementsCsv } from "@/features/settings/csv/history-csv";
import { tableSyncConfigs } from "@/features/sync/sync-config";

import type { MeasurementRecord } from "@/lib/types";

import {
  buildCircumferencePoints,
  countCircumferenceValues,
  findCircumferenceItem,
  formatDelta,
  isCircumferenceItem,
  readCircumferenceLimb,
  sideDifference,
  writeCircumferenceLimb,
} from "./circumference";
import { MEASUREMENT_ITEMS } from "./measurement-items";

afterEach(() => {
  vi.restoreAllMocks();
});

test("defines 20 circumference items after the basic ones, arm before leg, left before right", () => {
  const ids = MEASUREMENT_ITEMS.map((item) => item.id);
  expect(ids.slice(0, 3)).toEqual(["weight", "bodyFat", "height"]);
  expect(ids.slice(3, 7)).toEqual(["armPalmLeft", "armPalmRight", "armWristLeft", "armWristRight"]);
  expect(ids.slice(-2)).toEqual(["legGroinLeft", "legGroinRight"]);
  expect(ids).toHaveLength(23);
});

test("every circumference item is cm, 1 decimal, 5–150, not in the plain graph list", () => {
  const items = MEASUREMENT_ITEMS.filter(isCircumferenceItem);
  expect(items).toHaveLength(20);
  for (const item of items) {
    expect(item).toMatchObject({ unit: "cm", decimals: 1, min: 5, max: 150, showInGraph: false });
  }
});

test("findCircumferenceItem and the ja label", () => {
  const item = findCircumferenceItem("arm", "belowElbow", "right");
  expect(item.id).toBe("armBelowElbowRight");
  expect(getMessages("ja")[item.labelKey]).toBe("肘下5cm 右");
  expect(getMessages("en")[item.labelKey]).toBe("5 cm below elbow, right");
});

test("countCircumferenceValues counts only that limb", () => {
  expect(countCircumferenceValues({ weight: 60, armPalmLeft: 18, armPalmRight: 19, legAnkleLeft: 21 }, "arm")).toBe(2);
  expect(countCircumferenceValues({ weight: 60 }, "leg")).toBe(0);
});

test("limb storage defaults to arm and survives a throwing storage", () => {
  window.localStorage.clear();
  expect(readCircumferenceLimb()).toBe("arm");
  writeCircumferenceLimb("leg");
  expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("leg");
  expect(readCircumferenceLimb()).toBe("leg");
  window.localStorage.setItem("exerlog-circumference-limb", "tail");
  expect(readCircumferenceLimb()).toBe("arm");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readCircumferenceLimb()).toBe("arm");
});

test("CSV and the sync tab get a column for every circumference id", () => {
  const header = generateMeasurementsCsv([]).split("\n")[0];
  expect(header).toContain("armPalmLeft");
  expect(header).toContain("legGroinRight");
  const config = tableSyncConfigs().find((c) => c.tabName === "Measurements")!;
  const headers = config.buildHeaders!([]);
  expect(headers).toContain("armPalmLeft");
  expect(headers).toContain("legGroinRight");
});

const rec = (date: string, time: string, values: Record<string, number>): MeasurementRecord => ({
  id: `${date}${time}`, date, recordedAt: `${date}T${time}:00+09:00`, values, note: "", updatedAt: "",
});

test("buildCircumferencePoints uses the previous same-side value, even from before the range", () => {
  const points = buildCircumferencePoints(
    [
      rec("2026-10-20", "07:00", { armBelowElbowRight: 24.5, armBelowElbowLeft: 22.4 }),
      rec("2026-09-30", "07:00", { armBelowElbowRight: 24.2 }),
      rec("2026-10-21", "07:00", { armBelowElbowLeft: 22.5, weight: 60 }),
      rec("2026-10-21", "08:00", { weight: 60 }),
    ],
    "arm", "belowElbow", "2026-10-01",
  );
  expect(points).toEqual([
    { at: "2026-10-20T07:00:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 24.5 - 24.2 } },
    { at: "2026-10-21T07:00:00+09:00", left: { value: 22.5, delta: 22.5 - 22.4 } },
  ]);
});

test("formatDelta rounds before choosing the sign", () => {
  expect(formatDelta(24.5 - 24.2, 1)).toBe("+0.3");
  expect(formatDelta(-0.2, 1)).toBe("−0.2");
  expect(formatDelta(0.04, 1)).toBe("±0.0");
  expect(formatDelta(0, 1)).toBe("±0.0");
});

test("sideDifference only pairs sides of the same record", () => {
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: null } }, 1))
    .toEqual({ amount: 2.1, larger: "right" });
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null } }, 1)).toBeNull();
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null }, right: { value: 22.4, delta: null } }, 1))
    .toEqual({ amount: 0, larger: null });
});
