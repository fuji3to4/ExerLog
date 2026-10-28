import type { SelfCareItemId, SelfCareRecord } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
import { toCsv } from "@/features/settings/csv/history-csv";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import { scheduleSync } from "@/features/sync/auto-sync";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import { cell, nullableNumber, replaceTable } from "@/features/sync/sync-helpers";
import { isWithinPeriod, periodDayKeys } from "../period";
import type { RecordModuleData } from "../types";

const TOMBSTONE_TABLE = "SelfCare";

export const SELF_CARE_ITEMS: readonly SelfCareItemId[] = ["skincare", "exercise", "other"];

export type AddSelfCareRecordInput = Pick<SelfCareRecord, "date" | "recordedAt" | "item" | "minutes" | "note">;

export async function addSelfCareRecord(input: AddSelfCareRecordInput): Promise<SelfCareRecord> {
  const record: SelfCareRecord = {
    id: crypto.randomUUID(),
    date: input.date,
    recordedAt: input.recordedAt,
    item: input.item,
    minutes: input.minutes,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.selfCareRecords.add(record);
  scheduleSync();
  return record;
}

export async function updateSelfCareRecord(record: SelfCareRecord): Promise<void> {
  await appDb.selfCareRecords.put({ ...record, note: record.note.trim(), updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteSelfCareRecord(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.selfCareRecords, appDb.tombstones, async () => {
    await appDb.selfCareRecords.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Records for the day, oldest first. */
export function listSelfCareForDay(date: string): Promise<SelfCareRecord[]> {
  return appDb.selfCareRecords.where("date").equals(date).sortBy("recordedAt");
}

/** Records whose date is within [start, end] (inclusive day keys), oldest first. */
export function listSelfCareInRange(start: string, end: string): Promise<SelfCareRecord[]> {
  return appDb.selfCareRecords.where("date").between(start, end, true, true).sortBy("recordedAt");
}

export function generateSelfCareCsv(records: SelfCareRecord[]): string {
  return toCsv(
    ["date", "recordedAt", "item", "minutes", "note"],
    records.map((r) => [r.date, formatTimestampForCsv(r.recordedAt), r.item, r.minutes ?? "", r.note]),
  );
}

const selfCareConfig: TableSyncConfig = {
  tabName: TOMBSTONE_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "item", "recordedAt", "minutes", "note", "updatedAt"],
  toRow: (r: SelfCareRecord) => [
    r.id,
    r.date,
    r.item,
    r.recordedAt,
    r.minutes === null ? "" : String(r.minutes),
    r.note ?? "",
    r.updatedAt,
  ],
  fromRow: (row, headers): SelfCareRecord => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    item: cell(row, headers, "item") as SelfCareItemId,
    recordedAt: cell(row, headers, "recordedAt"),
    minutes: nullableNumber(cell(row, headers, "minutes")),
    note: cell(row, headers, "note"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.selfCareRecords.toArray(),
  replaceDb: (records) => replaceTable(appDb.selfCareRecords, records as SelfCareRecord[]),
};

export const selfCareData: RecordModuleData<SelfCareRecord> = {
  id: "selfcare",
  syncConfigs: [selfCareConfig],
  tables: () => [appDb.selfCareRecords],
  listForDay: listSelfCareForDay,
  async listInPeriod(period) {
    const { start, end } = periodDayKeys(period);
    const records = await listSelfCareInRange(start, end);
    return records.filter((r) => isWithinPeriod(r.recordedAt, period));
  },
  async datesWithRecordsInMonth(month) {
    const records = await appDb.selfCareRecords.where("date").startsWith(month).toArray();
    return new Set(records.map((r) => r.date));
  },
  async clearAll() {
    const ids = await appDb.selfCareRecords.toCollection().primaryKeys();
    await appDb.selfCareRecords.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  },
  count: () => appDb.selfCareRecords.count(),
  csv: {
    fileName: "selfcare.csv",
    exportLabelKey: "settings_export_selfcare",
    generate: async () => generateSelfCareCsv(await appDb.selfCareRecords.orderBy("recordedAt").toArray()),
  },
};
