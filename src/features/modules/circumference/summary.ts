import {
  CIRCUMFERENCE_SITES,
  LIMBS,
  circumferenceItemId,
  type CircumferenceSite,
  type Limb,
  type Side,
} from "@/features/measurements/circumference-sites";
import type { MeasurementRecord } from "@/lib/types";

type SideSummary = { first: number; last: number; diff: number };

export type SiteSummary = {
  limb: Limb;
  site: CircumferenceSite;
  left: SideSummary | null;
  right: SideSummary | null;
  /** Right minus left, only from records that contain both sides. */
  sideDiffFirst: number | null;
  sideDiffLast: number | null;
};

function sideSummary(sorted: MeasurementRecord[], itemId: string): SideSummary | null {
  const values = sorted.flatMap((record) => (itemId in record.values ? [record.values[itemId]] : []));
  if (values.length === 0) return null;
  const first = values[0];
  const last = values[values.length - 1];
  return { first, last, diff: last - first };
}

export function summarizeCircumference(
  records: MeasurementRecord[],
): { count: number; sites: SiteSummary[] } | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const sites: SiteSummary[] = [];

  for (const limb of LIMBS) {
    for (const site of CIRCUMFERENCE_SITES[limb]) {
      const id = (side: Side) => circumferenceItemId(limb, site, side);
      const left = sideSummary(sorted, id("left"));
      const right = sideSummary(sorted, id("right"));
      if (!left && !right) continue;
      const paired = sorted
        .filter((record) => id("left") in record.values && id("right") in record.values)
        .map((record) => record.values[id("right")] - record.values[id("left")]);
      sites.push({
        limb,
        site,
        left,
        right,
        sideDiffFirst: paired.length > 0 ? paired[0] : null,
        sideDiffLast: paired.length > 0 ? paired[paired.length - 1] : null,
      });
    }
  }

  return { count: records.length, sites };
}
