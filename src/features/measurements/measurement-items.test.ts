import { expect, test } from "vitest";

import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import { getMessages } from "@/features/i18n/messages";
import type { MeasurementRecord } from "@/lib/types";

import {
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

test("items are weight, bodyFat, height in that order", () => {
  expect(MEASUREMENT_ITEMS.map((item) => item.id)).toEqual(["weight", "bodyFat", "height"]);
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
  expect(formatMeasurementSummary(record, t)).toBe("体重 60.2kg・体脂肪率 22.0%");
});
