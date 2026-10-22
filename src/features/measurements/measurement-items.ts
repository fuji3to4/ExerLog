import type { Messages } from "@/features/i18n/messages";
import type { MeasurementRecord } from "@/lib/types";

export type MeasurementItem = {
  id: string;
  labelKey: keyof Messages;
  unit: string;
  decimals: number;
  min: number;
  max: number;
  showInGraph: boolean;
};

/** Display order = array order. "weight" and "height" ids are also used for BMI. */
export const MEASUREMENT_ITEMS: readonly MeasurementItem[] = [
  { id: "weight", labelKey: "measurement_item_weight", unit: "kg", decimals: 1, min: 1, max: 500, showInGraph: true },
  { id: "bodyFat", labelKey: "measurement_item_body_fat", unit: "%", decimals: 1, min: 1, max: 99, showInGraph: true },
  { id: "height", labelKey: "measurement_item_height", unit: "cm", decimals: 1, min: 30, max: 300, showInGraph: true },
];

/** Sheet columns that item ids must never collide with. */
export const MEASUREMENT_FIXED_COLUMNS = ["id", "date", "recordedAt", "note", "updatedAt"] as const;

export function getMeasurementItem(id: string): MeasurementItem | undefined {
  return MEASUREMENT_ITEMS.find((item) => item.id === id);
}

export function formatMeasurementValue(item: MeasurementItem, value: number): string {
  return value.toFixed(item.decimals);
}

/** "体重 60.2kg・体脂肪率 22.0%": known items present in the record, in list order. */
export function formatMeasurementSummary(
  record: MeasurementRecord,
  t: (key: keyof Messages, params?: Record<string, string | number>) => string,
): string {
  return MEASUREMENT_ITEMS.filter((item) => item.id in record.values)
    .map((item) => `${t(item.labelKey)} ${formatMeasurementValue(item, record.values[item.id])}${item.unit}`)
    .join("・");
}
