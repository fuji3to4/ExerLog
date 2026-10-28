import type { CompressionKind, CompressionRecord } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
import { toCsv } from "@/features/settings/csv/history-csv";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import { scheduleSync } from "@/features/sync/auto-sync";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import { cell, replaceTable } from "@/features/sync/sync-helpers";
import { isWithinPeriod, periodDayKeys } from "../period";
import type { RecordModuleData } from "../types";
import { wearMinutes } from "./summary";

const TOMBSTONE_TABLE = "Compression";

export const COMPRESSION_KINDS: readonly CompressionKind[] = ["garment", "bandage"];

export type AddCompressionRecordInput = Pick<CompressionRecord, "kind" | "recordedAt" | "endedAt" | "note">;

export async function addCompressionRecord(input: AddCompressionRecordInput): Promise<CompressionRecord> {
  const record: CompressionRecord = {
    id: crypto.randomUUID(),
    date: input.recordedAt.slice(0, 10),
    recordedAt: input.recordedAt,
    kind: input.kind,
    endedAt: input.endedAt,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.compressionRecords.add(record);
  scheduleSync();
  return record;
}

export async function updateCompressionRecord(record: CompressionRecord): Promise<void> {
  await appDb.compressionRecords.put({
    ...record,
    date: record.recordedAt.slice(0, 10),
    note: record.note.trim(),
    updatedAt: localIsoNow(),
  });
  scheduleSync();
}

export async function deleteCompressionRecord(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.compressionRecords, appDb.tombstones, async () => {
    await appDb.compressionRecords.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** The most recently started record of this kind that has not been taken off yet. */
export async function findOpenCompressionRecord(kind: CompressionKind): Promise<CompressionRecord | undefined> {
  const open = await appDb.compressionRecords
    .where("kind")
    .equals(kind)
    .filter((r) => r.endedAt === null)
    .toArray();
  return open.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
}

/** Records whose date is within [start, end] (inclusive day keys), oldest first. */
export function listCompressionInRange(start: string, end: string): Promise<CompressionRecord[]> {
  return appDb.compressionRecords.where("date").between(start, end, true, true).sortBy("recordedAt");
}

function listCompressionForDay(date: string): Promise<CompressionRecord[]> {
  return appDb.compressionRecords.where("date").equals(date).sortBy("recordedAt");
}

export function generateCompressionCsv(records: CompressionRecord[]): string {
  return toCsv(
    ["date", "kind", "startedAt", "endedAt", "minutes", "note"],
    records.map((r) => [
      r.date,
      r.kind,
      formatTimestampForCsv(r.recordedAt),
      r.endedAt === null ? "" : formatTimestampForCsv(r.endedAt),
      wearMinutes(r) ?? "",
      r.note,
    ]),
  );
}

const compressionConfig: TableSyncConfig = {
  tabName: TOMBSTONE_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "kind", "recordedAt", "endedAt", "note", "updatedAt"],
  toRow: (r: CompressionRecord) => [r.id, r.date, r.kind, r.recordedAt, r.endedAt ?? "", r.note ?? "", r.updatedAt],
  fromRow: (row, headers): CompressionRecord => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    kind: cell(row, headers, "kind") as CompressionKind,
    recordedAt: cell(row, headers, "recordedAt"),
    endedAt: cell(row, headers, "endedAt") || null,
    note: cell(row, headers, "note"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.compressionRecords.toArray(),
  replaceDb: (records) => replaceTable(appDb.compressionRecords, records as CompressionRecord[]),
};

export const compressionData: RecordModuleData<CompressionRecord> = {
  id: "compression",
  syncConfigs: [compressionConfig],
  tables: () => [appDb.compressionRecords],
  listForDay: listCompressionForDay,
  async listInPeriod(period) {
    const { start, end } = periodDayKeys(period);
    const records = await listCompressionInRange(start, end);
    return records.filter((r) => isWithinPeriod(r.recordedAt, period));
  },
  async datesWithRecordsInMonth(month) {
    const records = await appDb.compressionRecords.where("date").startsWith(month).toArray();
    return new Set(records.map((r) => r.date));
  },
  async clearAll() {
    const ids = await appDb.compressionRecords.toCollection().primaryKeys();
    await appDb.compressionRecords.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  },
  count: () => appDb.compressionRecords.count(),
  csv: {
    fileName: "compression.csv",
    exportLabelKey: "settings_export_compression",
    generate: async () => generateCompressionCsv(await appDb.compressionRecords.orderBy("recordedAt").toArray()),
  },
};
