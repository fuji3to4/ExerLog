import { expect, test } from "vitest";

import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import { getMessages } from "@/features/i18n/messages";
import type { MeasurementRecord } from "@/lib/types";

import {
  CIRCUMFERENCE_ITEMS,
  MEASUREMENT_FIXED_COLUMNS,
  formatMeasurementSummary,
  formatMeasurementValue,
  getMeasurementItem,
  type MeasurementItem,
} from "./measurement-items";

// Plain (non-circumference) items, to cover the value part of the summary.
const PLAIN: readonly MeasurementItem[] = [
  { id: "weight", labelKey: "measurement_item_weight", unit: "kg", decimals: 1, min: 1, max: 500, showInGraph: true },
  { id: "bodyFat", labelKey: "measurement_item_body_fat", unit: "%", decimals: 1, min: 1, max: 99, showInGraph: true },
];

test("item ids are unique and avoid the sheet fixed columns", () => {
  const ids = CIRCUMFERENCE_ITEMS.map((item) => item.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    expect(MEASUREMENT_FIXED_COLUMNS as readonly string[]).not.toContain(id);
  }
});

test("every labelKey exists in ja and en", () => {
  for (const item of CIRCUMFERENCE_ITEMS) {
    expect(item.labelKey in ja).toBe(true);
    expect(item.labelKey in en).toBe(true);
  }
});

test("circumference items are the 20 limb sites", () => {
  expect(CIRCUMFERENCE_ITEMS).toHaveLength(20);
  expect(CIRCUMFERENCE_ITEMS.every((item) => item.circumference !== undefined)).toBe(true);
  expect(getMeasurementItem("armWristLeft")?.unit).toBe("cm");
  expect(getMeasurementItem("weight")).toBeUndefined();
  expect(getMeasurementItem("nope")).toBeUndefined();
});

test("formatMeasurementValue uses the item's decimals", () => {
  expect(formatMeasurementValue(PLAIN[0], 60.25)).toBe("60.3");
});

test("formatMeasurementSummary counts the recorded arm and leg circumference sites among the given items", () => {
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
  expect(formatMeasurementSummary({ ...baseRecord, values }, [...PLAIN, ...CIRCUMFERENCE_ITEMS], t)).toBe(
    "腕の周径 2か所・脚の周径 1か所",
  );
  expect(formatMeasurementSummary({ ...baseRecord, values }, PLAIN, t)).toBe("");
  expect(formatMeasurementSummary({ ...baseRecord, values }, CIRCUMFERENCE_ITEMS, t)).toBe("腕の周径 2か所・脚の周径 1か所");
  expect(formatMeasurementSummary({ ...baseRecord, values: { legGroinRight: 53.4 } }, CIRCUMFERENCE_ITEMS, t)).toBe(
    "脚の周径 1か所",
  );
});
