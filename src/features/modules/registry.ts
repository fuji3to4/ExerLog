// Built-in record types (wellness, body, selfcare, girth) are custom record definitions shipped
// with the app (custom/builtin.ts); imported custom record types are added at run time from the
// custom type store.
// Adding a code record module requires:
//  1. a folder src/features/modules/<id>/ with data.ts (RecordModuleData) and module.tsx (RecordModule);
//  2. a slot in data-registry.ts and an entry in CODE_MODULES in registry.ts (this file);
//  3. its Dexie table in app-db.ts (new version);
//  4. `module_<id>_*` and `sync_tab_<Tab>` i18n keys in ja.ts and en.ts;
//  5. optionally `tags` (module-tags.ts) when the module only serves one audience; tagged modules start OFF unless the build enables the tag.
import type { CustomRecord } from "@/lib/types";

import { circumferenceModule } from "./circumference/module";
import { compressionModule } from "./compression/module";
import { builtinTags, type BuiltinId } from "./custom/builtin";
import { createCustomModule, type CustomModuleExtras } from "./custom/module";
import { recordModuleData, recordModuleEntries } from "./data-registry";
import { photoModule } from "./photo/module";
import { symptomsModule } from "./symptoms/module";
import type { RecordModule, RecordModuleData } from "./types";

export { builtinType } from "./data-registry";

const CODE_MODULES: readonly RecordModule[] = [
  circumferenceModule,
  photoModule,
  compressionModule,
  symptomsModule,
] as unknown as readonly RecordModule[];

/** Additions to the generic screens per built-in type (filled by later work, e.g. body's BMI). */
const BUILTIN_EXTRAS: Partial<Record<BuiltinId, CustomModuleExtras>> = {};

let cached: { data: readonly RecordModuleData[]; value: readonly RecordModule[] } | undefined;
// Record type module objects hold their own React components, so they are reused while the
// type and its data object are unchanged; a new object would remount every screen.
let typeModules = new Map<string, { key: string; data: RecordModuleData; module: RecordModule }>();

/**
 * Every record module with its screens, in the same order and with the same data objects as
 * `recordModuleData()`: built-in and code modules in their fixed order, then one per imported
 * custom record type (deleted types included, marked `hidden`). Returns the same array while
 * the custom types are unchanged.
 * Each module is typed over its own record type; the list widens them (a component taking
 * `RecordFormProps<CompressionRecord>` is only ever given compression records, because a timeline
 * item or dialog always pairs a record with the module it came from).
 */
export function recordModules(): readonly RecordModule[] {
  const data = recordModuleData();
  if (cached?.data === data) return cached.value;
  const byData = new Map(CODE_MODULES.map((m) => [m.data, m]));
  const next = new Map<string, { key: string; data: RecordModuleData; module: RecordModule }>();
  const value: RecordModule[] = [];
  for (const entry of recordModuleEntries()) {
    if (entry.kind === "code") {
      const codeModule = byData.get(entry.data);
      if (!codeModule) throw new Error(`No screens for record module ${entry.data.id}`);
      value.push(codeModule);
      continue;
    }
    const { type } = entry;
    const key = `${type.updatedAt}|${type.deleted ? 1 : 0}`;
    const previous = typeModules.get(type.id);
    const reused = previous && previous.key === key && previous.data === entry.data ? previous : undefined;
    const item = reused ?? {
      key,
      data: entry.data,
      module: createCustomModule(
        type,
        entry.data as unknown as RecordModuleData<CustomRecord>,
        entry.kind === "builtin"
          ? { isCustom: false, tags: builtinTags(entry.id), extras: BUILTIN_EXTRAS[entry.id] }
          : undefined,
      ) as unknown as RecordModule,
    };
    next.set(type.id, item);
    value.push(item.module);
  }
  typeModules = next;
  cached = { data, value };
  return value;
}

export function getRecordModule(id: string): RecordModule | undefined {
  return recordModules().find((module) => module.data.id === id);
}
