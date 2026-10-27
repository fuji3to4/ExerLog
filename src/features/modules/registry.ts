import { bodyModule } from "./body/module";
import { circumferenceModule } from "./circumference/module";
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
] as unknown as readonly RecordModule[];

export function getRecordModule(id: string): RecordModule | undefined {
  return RECORD_MODULES.find((module) => module.data.id === id);
}
