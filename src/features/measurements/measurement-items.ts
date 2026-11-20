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
  /** The left/right arm and leg circumference site. */
  circumference?: CircumferencePlace;
};

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

/** Sheet columns that item ids must never collide with. */
export const MEASUREMENT_FIXED_COLUMNS = ["id", "date", "recordedAt", "note", "updatedAt"] as const;

export function getMeasurementItem(id: string): MeasurementItem | undefined {
  return CIRCUMFERENCE_ITEMS.find((item) => item.id === id);
}

export function formatMeasurementValue(item: MeasurementItem, value: number): string {
  return value.toFixed(item.decimals);
}

/**
 * "腕の周径 2か所・脚の周径 1か所": a per-limb count of the recorded circumference sites among `items`
 * (arm, then leg). Values for ids not in `items` are left out.
 */
export function formatMeasurementSummary(
  record: MeasurementRecord,
  items: readonly MeasurementItem[],
  t: (key: keyof Messages, params?: Record<string, string | number>) => string,
): string {
  const parts: string[] = [];
  for (const limb of LIMBS) {
    const count = items.filter((item) => item.circumference?.limb === limb && item.id in record.values).length;
    if (count > 0) parts.push(t(`circumference_summary_${limb}`, { count }));
  }
  return parts.join("・");
}
