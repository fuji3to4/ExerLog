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
