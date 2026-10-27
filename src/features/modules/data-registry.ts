import { bodyData } from "./body/data";
import { circumferenceData } from "./circumference/data";
import { photoData } from "./photo/data";
import type { RecordModuleData } from "./types";
import { wellnessData } from "./wellness/data";

let cached: readonly RecordModuleData[] | undefined;

/**
 * A function (not a constant) because of an import cycle: module data files
 * import the sync scheduler, which reaches sync-config, which reads this
 * registry. Built on first call and cached; every call returns the same array.
 */
export function recordModuleData(): readonly RecordModuleData[] {
  cached ??= [wellnessData, bodyData, circumferenceData, photoData] as readonly RecordModuleData[];
  return cached;
}

export function getModuleData(id: string): RecordModuleData | undefined {
  return recordModuleData().find((module) => module.id === id);
}
