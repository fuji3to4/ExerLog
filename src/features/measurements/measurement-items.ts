import type { Messages } from "@/features/i18n/messages";
import type { MeasurementRecord } from "@/lib/types";

import {
  CIRCUMFERENCE_SITES,
  LIMBS,
  SIDES,
  circumferenceItemId,
  type CircumferencePlace,
} from "./circumference-sites";

export type MeasurementItem = {
  id: string;
  labelKey: keyof Messages;
  unit: string;
  decimals: number;
  min: number;
  max: number;
  showInGraph: boolean;
  /** Set only for the left/right arm and leg circumference items. */
  circumference?: CircumferencePlace;
};

/** Body items. Display order = array order. "weight" and "height" ids are also used for BMI. */
export const BODY_ITEMS: readonly MeasurementItem[] = [
  { id: "weight", labelKey: "measurement_item_weight", unit: "kg", decimals: 1, min: 1, max: 500, showInGraph: true },
  { id: "bodyFat", labelKey: "measurement_item_body_fat", unit: "%", decimals: 1, min: 1, max: 99, showInGraph: true },
  { id: "height", labelKey: "measurement_item_height", unit: "cm", decimals: 1, min: 30, max: 300, showInGraph: true },
];

/** Circumference items: arm then leg, sites in order, left then right. */
export const CIRCUMFERENCE_ITEMS: readonly MeasurementItem[] = LIMBS.flatMap((limb) =>
  CIRCUMFERENCE_SITES[limb].flatMap((site) =>
    SIDES.map((side): MeasurementItem => {
      const id = circumferenceItemId(limb, site, side);
      return {
        id,
        labelKey: `measurement_item_${id}` as keyof Messages,
        unit: "cm",
        decimals: 1,
        min: 5,
        max: 150,
        showInGraph: false,
        circumference: { limb, site, side },
      };
    }),
  ),
);

/** Body then circumference items. Kept for older callers; new code uses BODY_ITEMS / CIRCUMFERENCE_ITEMS. */
export const MEASUREMENT_ITEMS: readonly MeasurementItem[] = [...BODY_ITEMS, ...CIRCUMFERENCE_ITEMS];

/** Sheet columns that item ids must never collide with. */
export const MEASUREMENT_FIXED_COLUMNS = ["id", "date", "recordedAt", "note", "updatedAt"] as const;

export function getMeasurementItem(id: string): MeasurementItem | undefined {
  return BODY_ITEMS.find((item) => item.id === id) ?? CIRCUMFERENCE_ITEMS.find((item) => item.id === id);
}

export function formatMeasurementValue(item: MeasurementItem, value: number): string {
  return value.toFixed(item.decimals);
}

/**
 * "体重 60.2kg・体脂肪率 22.0%・腕の周径 2か所": the non-circumference ones of `items` in list order,
 * then a per-limb count of the recorded circumference sites among `items` (arm, then leg).
 * Values for ids not in `items` are left out.
 */
export function formatMeasurementSummary(
  record: MeasurementRecord,
  items: readonly MeasurementItem[],
  t: (key: keyof Messages, params?: Record<string, string | number>) => string,
): string {
  const parts = items.filter((item) => !item.circumference && item.id in record.values).map(
    (item) => `${t(item.labelKey)} ${formatMeasurementValue(item, record.values[item.id])}${item.unit}`,
  );
  for (const limb of LIMBS) {
    const count = items.filter((item) => item.circumference?.limb === limb && item.id in record.values).length;
    if (count > 0) parts.push(t(`circumference_summary_${limb}`, { count }));
  }
  return parts.join("・");
}
