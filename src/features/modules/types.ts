import type { Table } from "dexie";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import type { Messages } from "@/features/i18n/messages";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import type { SyncTableResult } from "@/features/sync/sync-engine";
import type { WellnessLabel } from "@/features/timeline/build-timeline";
import type { Period } from "./period";

/** The time-of-day / around-a-video tag a timeline row may carry. */
export type TimeLabel = WellnessLabel;

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
  /** 表の同期とは別のファイル同期。Tombstones のマージ直後、ほかのタブより前に呼ばれる。 */
  syncFiles?(accessToken: string): Promise<SyncTableResult>;
};

/** Props of a module's form. The form is mounted only while its dialog is open. */
export type RecordFormProps<R> = {
  onOpenChange(open: boolean): void;
  date: string;
  /** The record being edited; absent when adding. */
  record?: R;
  onSaved(record: R): void;
  onDeleted?(): void;
};

/** A record module: its data layer plus the screens that show and edit its records. */
export type RecordModule<R extends ModuleRecord = ModuleRecord> = {
  data: RecordModuleData<R>;
  labelKey: keyof Messages;
  /** Short description for the settings screen. */
  descriptionKey: keyof Messages;
  editTitleKey: keyof Messages;
  icon: LucideIcon;
  /** Colour of the module's point on the timeline. */
  color: string;
  Form: ComponentType<RecordFormProps<R>>;
  /** Body of a timeline row (the row chrome, time and point belong to the timeline). */
  TimelineCard: ComponentType<{ record: R; label: TimeLabel | null }>;
  HistoryView: ComponentType;
  SummaryCard: ComponentType<{ period: Period }>;
};
