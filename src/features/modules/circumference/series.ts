import {
  buildCircumferencePoints,
  type CircumferencePoint,
  type CircumferenceSite,
  type Limb,
} from "@/features/measurements/circumference";
import type { DayRange } from "@/features/history/range-presets";

import { circumferenceRepository } from "./data";

/** Reads records up to the range end so earlier ones can serve as "previous" values. */
export async function buildCircumferenceSeries(input: {
  range: DayRange;
  limb: Limb;
  site: CircumferenceSite;
}): Promise<CircumferencePoint[]> {
  const upToEnd = await circumferenceRepository.listInDayRange("0000-01-01", input.range.end);
  return buildCircumferencePoints(upToEnd, input.limb, input.site, input.range.start);
}
