import { afterEach, expect, test, vi } from "vitest";

import { getMessages } from "@/features/i18n/messages";
import { generateMeasurementsCsv } from "@/features/settings/csv/history-csv";
import { TABLE_SYNC_CONFIGS } from "@/features/sync/sync-config";

import {
  countCircumferenceValues,
  findCircumferenceItem,
  isCircumferenceItem,
  readCircumferenceLimb,
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
  const config = TABLE_SYNC_CONFIGS.find((c) => c.tabName === "Measurements")!;
  const headers = config.buildHeaders!([]);
  expect(headers).toContain("armPalmLeft");
  expect(headers).toContain("legGroinRight");
});
