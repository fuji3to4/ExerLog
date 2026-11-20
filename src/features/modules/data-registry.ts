import type { CustomRecordType } from "@/lib/types";

import { circumferenceData } from "./circumference/data";
import { compressionData } from "./compression/data";
import { BUILTIN_SEED_UPDATED_AT, builtinDefinition, isBuiltinId, type BuiltinId } from "./custom/builtin";
import { createCustomModuleData } from "./custom/data";
import { getCustomTypes } from "./custom/type-store";
import { photoData } from "./photo/data";
import { symptomsData } from "./symptoms/data";
import type { RecordModuleData } from "./types";

/** One registry slot: a code module, or a record type (built-in or imported) with its data. */
export type RecordModuleEntry =
  | { kind: "code"; data: RecordModuleData }
  | { kind: "builtin"; id: BuiltinId; type: CustomRecordType; data: RecordModuleData }
  | { kind: "custom"; type: CustomRecordType; data: RecordModuleData };

/** Fixed slots: built-in ids interleaved with the code modules, in the registry order. */
type Slot = BuiltinId | RecordModuleData;

let slots: readonly Slot[] | undefined;
let cached: { types: readonly CustomRecordType[]; entries: readonly RecordModuleEntry[]; value: readonly RecordModuleData[] } | undefined;
// One data object per record type, reused while its definition is unchanged (same key).
let typeData = new Map<string, { key: string; data: RecordModuleData }>();

/**
 * A built-in type: the store's row when it has one, otherwise the shipped definition
 * with the fixed seed date (before the store has loaded, or when the stored row cannot be parsed).
 */
export function builtinType(id: BuiltinId): CustomRecordType {
  const stored = getCustomTypes().find((type) => type.id === id);
  if (stored) return { ...stored, deleted: false };
  return { id, definition: structuredClone(builtinDefinition(id)), deleted: false, updatedAt: BUILTIN_SEED_UPDATED_AT };
}

function dataFor(
  type: CustomRecordType,
  key: string,
  moduleId: string | undefined,
  next: Map<string, { key: string; data: RecordModuleData }>,
): RecordModuleData {
  const previous = typeData.get(type.id);
  const entry =
    previous && previous.key === key
      ? previous
      : { key, data: createCustomModuleData(type, { moduleId }) as unknown as RecordModuleData };
  next.set(type.id, entry);
  return entry.data;
}

/**
 * Every registry slot in order: wellness, body, girth, circumference, photo, selfcare,
 * compression, symptoms, then one per imported custom record type (deleted types
 * included, so their records are still counted, cleared, exported and synced).
 *
 * A function (not a constant) because of an import cycle: module data files import the
 * sync scheduler, which reaches sync-config, which reads this registry. Cached on the
 * custom type store's array: the same array is returned while the types are unchanged.
 */
export function recordModuleEntries(): readonly RecordModuleEntry[] {
  return build().entries;
}

function build(): { entries: readonly RecordModuleEntry[]; value: readonly RecordModuleData[] } {
  slots ??= ["wellness", "body", "girth", circumferenceData, photoData, "selfcare", compressionData, symptomsData] as readonly Slot[];
  const types = getCustomTypes();
  if (cached?.types === types) return cached;
  const next = new Map<string, { key: string; data: RecordModuleData }>();
  const entries: RecordModuleEntry[] = [];
  for (const slot of slots) {
    if (typeof slot !== "string") {
      entries.push({ kind: "code", data: slot });
      continue;
    }
    const type = builtinType(slot);
    // The source is part of the key: a stored seed shares the fixed date with the shipped fallback.
    const stored = types.some((t) => t.id === slot);
    const data = dataFor(type, `${stored ? "store" : "shipped"}|${type.updatedAt}`, slot, next);
    entries.push({ kind: "builtin", id: slot, type, data });
  }
  for (const type of types) {
    if (isBuiltinId(type.id)) continue;
    entries.push({ kind: "custom", type, data: dataFor(type, type.updatedAt, undefined, next) });
  }
  typeData = next;
  cached = { types, entries, value: entries.map((entry) => entry.data) };
  return cached;
}

export function recordModuleData(): readonly RecordModuleData[] {
  return build().value;
}

export function getModuleData(id: string): RecordModuleData | undefined {
  return recordModuleData().find((module) => module.id === id);
}
