// Adding a record module requires:
//  1. a folder src/features/modules/<id>/ with data.ts (RecordModuleData) and module.tsx (RecordModule);
//  2. one line in data-registry.ts;
//  3. one line in registry.ts (this file);
//  4. its Dexie table in app-db.ts (new version);
//  5. `module_<id>_*` and `sync_tab_<Tab>` i18n keys in ja.ts and en.ts.
import { bodyModule } from "./body/module";
import { circumferenceModule } from "./circumference/module";
import { compressionModule } from "./compression/module";
import { photoModule } from "./photo/module";
import { selfCareModule } from "./selfcare/module";
import { symptomsModule } from "./symptoms/module";
import type { RecordModule } from "./types";
import { wellnessModule } from "./wellness/module";

/**
 * Every record module with its screens, in the same order and with the same data objects as
 * `recordModuleData()`. Each module is typed over its own record type; the list widens them
 * (a component taking `RecordFormProps<WellnessEntry>` is only ever given wellness records,
 * because a timeline item or dialog always pairs a record with the module it came from).
 */
export const RECORD_MODULES: readonly RecordModule[] = [
  wellnessModule,
  bodyModule,
  circumferenceModule,
  photoModule,
  selfCareModule,
  compressionModule,
  symptomsModule,
] as unknown as readonly RecordModule[];

export function getRecordModule(id: string): RecordModule | undefined {
  return RECORD_MODULES.find((module) => module.data.id === id);
}
