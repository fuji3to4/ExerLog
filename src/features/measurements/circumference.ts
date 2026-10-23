import type { MeasurementRecord } from "@/lib/types";

import { MEASUREMENT_ITEMS, type MeasurementItem } from "./measurement-items";
import { circumferenceItemId, type Limb, type Side, type CircumferenceSite } from "./circumference-sites";

export * from "./circumference-sites";

export function findCircumferenceItem(limb: Limb, site: CircumferenceSite, side: Side): MeasurementItem {
  const id = circumferenceItemId(limb, site, side);
  const item = MEASUREMENT_ITEMS.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown circumference item: ${id}`);
  return item;
}

export function isCircumferenceItem(item: MeasurementItem): boolean {
  return item.circumference !== undefined;
}

export function countCircumferenceValues(values: Record<string, number>, limb: Limb): number {
  return MEASUREMENT_ITEMS.filter((item) => item.circumference?.limb === limb && item.id in values).length;
}

export const CIRCUMFERENCE_LIMB_STORAGE_KEY = "exerlog-circumference-limb";

export function readCircumferenceLimb(): Limb {
  try {
    const stored = window.localStorage.getItem(CIRCUMFERENCE_LIMB_STORAGE_KEY);
    return stored === "leg" ? "leg" : "arm";
  } catch {
    return "arm";
  }
}

export function writeCircumferenceLimb(limb: Limb): void {
  try {
    window.localStorage.setItem(CIRCUMFERENCE_LIMB_STORAGE_KEY, limb);
  } catch {
    // Storage may be blocked; the choice just won't persist.
  }
}

/** Shared by the input headings and the graphs. */
export const SIDE_COLORS: Record<Side, string> = { left: "#2f7fc1", right: "#d9534f" };

/** delta: difference from the previous record of the same site and side; null when there is none. */
export type SideReading = { value: number; delta: number | null };
export type CircumferencePoint = { at: string; left?: SideReading; right?: SideReading };

/**
 * Records may be in any order. Records dated before rangeStart only serve as the
 * "previous" value for deltas and never become points.
 */
export function buildCircumferencePoints(
  records: MeasurementRecord[],
  limb: Limb,
  site: CircumferenceSite,
  rangeStart: string,
): CircumferencePoint[] {
  const ids = {
    left: circumferenceItemId(limb, site, "left"),
    right: circumferenceItemId(limb, site, "right"),
  };
  const sorted = [...records].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const previous: Record<Side, number | null> = { left: null, right: null };
  const points: CircumferencePoint[] = [];

  for (const record of sorted) {
    const point: CircumferencePoint = { at: record.recordedAt };
    for (const side of ["left", "right"] as const) {
      const value = record.values[ids[side]];
      if (value === undefined) continue;
      const last = previous[side];
      point[side] = { value, delta: last === null ? null : value - last };
      previous[side] = value;
    }
    if ((point.left || point.right) && record.date >= rangeStart) points.push(point);
  }

  return points;
}

/** "+0.3" / "−0.2" / "±0.0". Rounds to `decimals` first, then chooses the sign. */
export function formatDelta(delta: number, decimals: number): string {
  const rounded = Number(delta.toFixed(decimals));
  if (rounded === 0) return `±${(0).toFixed(decimals)}`;
  return rounded > 0 ? `+${rounded.toFixed(decimals)}` : `−${Math.abs(rounded).toFixed(decimals)}`;
}

/** Only when both sides are present. `larger` is null when the rounded difference is 0. */
export function sideDifference(
  point: CircumferencePoint,
  decimals: number,
): { amount: number; larger: Side | null } | null {
  if (!point.left || !point.right) return null;
  const diff = point.right.value - point.left.value;
  const amount = Number(Math.abs(diff).toFixed(decimals));
  if (amount === 0) return { amount: 0, larger: null };
  return { amount, larger: diff > 0 ? "right" : "left" };
}
