import { expect, test } from "vitest";

import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import { getMessages } from "@/features/i18n/messages";
import type { MeasurementRecord } from "@/lib/types";

import {
  BODY_ITEMS,
  CIRCUMFERENCE_ITEMS,
  MEASUREMENT_FIXED_COLUMNS,
  MEASUREMENT_ITEMS,
  formatMeasurementSummary,
  formatMeasurementValue,
  getMeasurementItem,
} from "./measurement-items";

test("item ids are unique and avoid the sheet fixed columns", () => {
  const ids = MEASUREMENT_ITEMS.map((item) => item.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    expect(MEASUREMENT_FIXED_COLUMNS as readonly string[]).not.toContain(id);
  }
});

test("every labelKey exists in ja and en", () => {
  for (const item of MEASUREMENT_ITEMS) {
    expect(item.labelKey in ja).toBe(true);
    expect(item.labelKey in en).toBe(true);
  }
});

test("body items are weight, bodyFat, height; circumference items are the 20 limb sites", () => {
  expect(BODY_ITEMS.map((item) => item.id)).toEqual(["weight", "bodyFat", "height"]);
  expect(CIRCUMFERENCE_ITEMS).toHaveLength(20);
  expect(CIRCUMFERENCE_ITEMS.every((item) => item.circumference !== undefined)).toBe(true);
  expect(getMeasurementItem("armWristLeft")?.unit).toBe("cm");
});

test("items start with weight, bodyFat, height in that order", () => {
  expect(MEASUREMENT_ITEMS.slice(0, 3).map((item) => item.id)).toEqual(["weight", "bodyFat", "height"]);
  expect(getMeasurementItem("weight")?.unit).toBe("kg");
  expect(getMeasurementItem("nope")).toBeUndefined();
});

test("formatMeasurementValue uses the item's decimals", () => {
  expect(formatMeasurementValue(getMeasurementItem("weight")!, 60.25)).toBe("60.3");
});

test("formatMeasurementSummary joins known items in list order and omits unknown ones", () => {
  const record: MeasurementRecord = {
    id: "1",
    date: "2026-10-22",
    recordedAt: "2026-10-22T07:12:00+09:00",
    values: { bodyFat: 22, weight: 60.2, waist: 80 },
    note: "",
    updatedAt: "2026-10-22T07:12:00+09:00",
  };
  const messages = getMessages("ja");
  const t = (key: keyof typeof messages) => messages[key];
  expect(formatMeasurementSummary(record, BODY_ITEMS, t)).toBe("体重 60.2kg・体脂肪率 22.0%");
});

test("formatMeasurementSummary lists only the given items: body values, or arm and leg circumference counts", () => {
  const baseRecord: MeasurementRecord = {
    id: "1",
    date: "2026-10-22",
    recordedAt: "2026-10-22T07:12:00+09:00",
    values: {},
    note: "",
    updatedAt: "2026-10-22T07:12:00+09:00",
  };
  const messages = getMessages("ja");
  const t = (key: keyof typeof messages, params?: Record<string, string | number>) =>
    messages[key].replace(/\{(\w+)\}/g, (_, name) => String(params?.[name]));
  const values = { weight: 60.2, legAnkleLeft: 21, armPalmLeft: 18, armPalmRight: 19 };
  expect(formatMeasurementSummary({ ...baseRecord, values }, MEASUREMENT_ITEMS, t)).toBe(
    "体重 60.2kg・腕の周径 2か所・脚の周径 1か所",
  );
  expect(formatMeasurementSummary({ ...baseRecord, values }, BODY_ITEMS, t)).toBe("体重 60.2kg");
  expect(formatMeasurementSummary({ ...baseRecord, values }, CIRCUMFERENCE_ITEMS, t)).toBe("腕の周径 2か所・脚の周径 1か所");
  expect(formatMeasurementSummary({ ...baseRecord, values: { legGroinRight: 53.4 } }, CIRCUMFERENCE_ITEMS, t)).toBe(
    "脚の周径 1か所",
  );
});
