import type { CustomRecordType } from "@/lib/types";

import { bodyData } from "./body/data";
import { circumferenceData } from "./circumference/data";
import { compressionData } from "./compression/data";
import { createCustomModuleData } from "./custom/data";
import { getCustomTypes } from "./custom/type-store";
import { girthData } from "./girth/data";
import { photoData } from "./photo/data";
import { selfCareData } from "./selfcare/data";
import { symptomsData } from "./symptoms/data";
import type { RecordModuleData } from "./types";
import { wellnessData } from "./wellness/data";

let codeModules: readonly RecordModuleData[] | undefined;
let cached: { types: readonly CustomRecordType[]; value: readonly RecordModuleData[] } | undefined;
// One data object per custom type, reused while its definition (updatedAt) is unchanged.
let customData = new Map<string, { updatedAt: string; data: RecordModuleData }>();

/**
 * The eight code modules followed by one per imported custom record type
 * (deleted types included, so their records are still counted, cleared,
 * exported and synced).
 *
 * A function (not a constant) because of an import cycle: module data files
 * import the sync scheduler, which reaches sync-config, which reads this
 * registry. Cached on the custom type store's array: the same array is
 * returned while the types are unchanged.
 */
export function recordModuleData(): readonly RecordModuleData[] {
  codeModules ??= [wellnessData, bodyData, girthData, circumferenceData, photoData, selfCareData, compressionData, symptomsData] as readonly RecordModuleData[];
  const types = getCustomTypes();
  if (cached?.types === types) return cached.value;
  const nextData = new Map<string, { updatedAt: string; data: RecordModuleData }>();
  for (const type of types) {
    const previous = customData.get(type.id);
    const entry =
      previous && previous.updatedAt === type.updatedAt
        ? previous
        : { updatedAt: type.updatedAt, data: createCustomModuleData(type) as unknown as RecordModuleData };
    nextData.set(type.id, entry);
  }
  customData = nextData;
  const value = [...codeModules, ...types.map((type) => nextData.get(type.id)!.data)];
  cached = { types, value };
  return value;
}

export function getModuleData(id: string): RecordModuleData | undefined {
  return recordModuleData().find((module) => module.id === id);
}
