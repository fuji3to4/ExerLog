// Imported custom record types are added at run time from the custom type store.
// Adding a code record module requires:
//  1. a folder src/features/modules/<id>/ with data.ts (RecordModuleData) and module.tsx (RecordModule);
//  2. one line in data-registry.ts;
//  3. one line in CODE_MODULES in registry.ts (this file);
//  4. its Dexie table in app-db.ts (new version);
//  5. `module_<id>_*` and `sync_tab_<Tab>` i18n keys in ja.ts and en.ts;
//  6. optionally `tags` (module-tags.ts) when the module only serves one audience; tagged modules start OFF unless the build enables the tag.
import type { CustomRecord } from "@/lib/types";

import { bodyModule } from "./body/module";
import { circumferenceModule } from "./circumference/module";
import { compressionModule } from "./compression/module";
import { customModuleId } from "./custom/data";
import { createCustomModule } from "./custom/module";
import { getCustomTypes } from "./custom/type-store";
import { recordModuleData } from "./data-registry";
import { girthModule } from "./girth/module";
import { photoModule } from "./photo/module";
import { selfCareModule } from "./selfcare/module";
import { symptomsModule } from "./symptoms/module";
import type { RecordModule, RecordModuleData } from "./types";
import { wellnessModule } from "./wellness/module";

const CODE_MODULES: readonly RecordModule[] = [
  wellnessModule,
  bodyModule,
  girthModule,
  circumferenceModule,
  photoModule,
  selfCareModule,
  compressionModule,
  symptomsModule,
] as unknown as readonly RecordModule[];

let cached: { data: readonly RecordModuleData[]; value: readonly RecordModule[] } | undefined;
// Custom module objects hold their own React components, so they are reused while the
// type and its data object are unchanged; a new object would remount every screen.
let customModules = new Map<string, { key: string; data: RecordModuleData; module: RecordModule }>();

/**
 * Every record module with its screens, in the same order and with the same data objects as
 * `recordModuleData()`: the code modules, then one per imported custom record type (deleted
 * types included, marked `hidden`). Returns the same array while the custom types are unchanged.
 * Each module is typed over its own record type; the list widens them (a component taking
 * `RecordFormProps<WellnessEntry>` is only ever given wellness records, because a timeline item
 * or dialog always pairs a record with the module it came from).
 */
export function recordModules(): readonly RecordModule[] {
  const data = recordModuleData();
  if (cached?.data === data) return cached.value;
  const byId = new Map(data.map((d) => [d.id, d]));
  const next = new Map<string, { key: string; data: RecordModuleData; module: RecordModule }>();
  const custom: RecordModule[] = [];
  for (const type of getCustomTypes()) {
    const moduleData = byId.get(customModuleId(type.id));
    if (!moduleData) continue;
    const key = `${type.updatedAt}|${type.deleted ? 1 : 0}`;
    const previous = customModules.get(type.id);
    const entry =
      previous && previous.key === key && previous.data === moduleData
        ? previous
        : {
            key,
            data: moduleData,
            module: createCustomModule(
              type,
              moduleData as unknown as RecordModuleData<CustomRecord>,
            ) as unknown as RecordModule,
          };
    next.set(type.id, entry);
    custom.push(entry.module);
  }
  customModules = next;
  const value = [...CODE_MODULES, ...custom];
  cached = { data, value };
  return value;
}

export function getRecordModule(id: string): RecordModule | undefined {
  return recordModules().find((module) => module.data.id === id);
}
