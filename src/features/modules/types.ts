import type { Table } from "dexie";

import type { Messages } from "@/features/i18n/messages";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import type { Period } from "./period";

export type ModuleRecord = { id: string; date: string; recordedAt: string };

/** Data-layer contract of one record module. The UI side is added separately. */
export type RecordModuleData<R extends ModuleRecord = ModuleRecord> = {
  id: string;
  syncConfigs: TableSyncConfig[];
  /** Tables included in the sync and clear-all transactions. */
  tables(): Table<any, any>[];
  /** Oldest first. */
  listForDay(date: string): Promise<R[]>;
  /** Oldest first; narrowed to the period's instants with isWithinPeriod. */
  listInPeriod(period: Period): Promise<R[]>;
  /** Day keys with at least one record in the month (`YYYY-MM`). */
  datesWithRecordsInMonth(month: string): Promise<Set<string>>;
  /** Deletes everything and records tombstones. Must run inside the caller's transaction. */
  clearAll(): Promise<void>;
  count(): Promise<number>;
  csv: { fileName: string; exportLabelKey: keyof Messages; generate(): Promise<string> };
};
