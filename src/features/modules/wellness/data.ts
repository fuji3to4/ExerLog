import type { WellnessEntry, WellnessScore } from "@/lib/types";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
import { toCsv } from "@/features/settings/csv/history-csv";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import { scheduleSync } from "@/features/sync/auto-sync";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import { cell, replaceTable } from "@/features/sync/sync-helpers";
import { isWithinPeriod, periodDayKeys } from "../period";
import type { RecordModuleData } from "../types";

const TOMBSTONE_TABLE = "WellnessEntries";

export type AddWellnessEntryInput = Pick<
  WellnessEntry,
  "date" | "physicalScore" | "mentalScore" | "note"
> & { recordedAt?: string };

export async function addWellnessEntry(input: AddWellnessEntryInput): Promise<WellnessEntry> {
  const entry: WellnessEntry = {
    id: crypto.randomUUID(),
    date: input.date,
    recordedAt: input.recordedAt ?? localIsoAt(input.date),
    physicalScore: input.physicalScore,
    mentalScore: input.mentalScore,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.wellnessEntries.add(entry);
  scheduleSync();
  return entry;
}

export async function updateWellnessEntry(entry: WellnessEntry): Promise<void> {
  await appDb.wellnessEntries.put({ ...entry, note: entry.note.trim(), updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteWellnessEntry(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.wellnessEntries, appDb.tombstones, async () => {
    await appDb.wellnessEntries.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Entries for the day, oldest first. */
export function listWellnessEntriesForDay(date: string): Promise<WellnessEntry[]> {
  return appDb.wellnessEntries.where("date").equals(date).sortBy("recordedAt");
}

export async function getLatestWellnessEntry(date: string): Promise<WellnessEntry | undefined> {
  const entries = await listWellnessEntriesForDay(date);
  return entries.at(-1);
}

/** Entries whose date is within [start, end] (inclusive day keys), oldest first. */
export function listWellnessEntriesInRange(start: string, end: string): Promise<WellnessEntry[]> {
  return appDb.wellnessEntries.where("date").between(start, end, true, true).sortBy("recordedAt");
}

export function generateWellnessEntriesCsv(entries: WellnessEntry[]): string {
  return toCsv(
    ["date", "recordedAt", "physicalScore", "mentalScore", "note"],
    entries.map((entry) => [
      entry.date,
      formatTimestampForCsv(entry.recordedAt),
      entry.physicalScore,
      entry.mentalScore,
      entry.note,
    ]),
  );
}

const wellnessEntriesConfig: TableSyncConfig = {
  tabName: TOMBSTONE_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "recordedAt", "physicalScore", "mentalScore", "note", "updatedAt"],
  toRow: (r: WellnessEntry) => [
    r.id,
    r.date,
    r.recordedAt,
    String(r.physicalScore),
    String(r.mentalScore),
    r.note ?? "",
    r.updatedAt,
  ],
  fromRow: (row, headers): WellnessEntry => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    recordedAt: cell(row, headers, "recordedAt"),
    physicalScore: Number(cell(row, headers, "physicalScore")) as WellnessScore,
    mentalScore: Number(cell(row, headers, "mentalScore")) as WellnessScore,
    note: cell(row, headers, "note"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.wellnessEntries.toArray(),
  replaceDb: (records) => replaceTable(appDb.wellnessEntries, records as WellnessEntry[]),
};

export const wellnessData: RecordModuleData<WellnessEntry> = {
  id: "wellness",
  syncConfigs: [wellnessEntriesConfig],
  tables: () => [appDb.wellnessEntries],
  listForDay: listWellnessEntriesForDay,
  async listInPeriod(period) {
    const { start, end } = periodDayKeys(period);
    const entries = await listWellnessEntriesInRange(start, end);
    return entries.filter((entry) => isWithinPeriod(entry.recordedAt, period));
  },
  async datesWithRecordsInMonth(month) {
    const entries = await appDb.wellnessEntries.where("date").startsWith(month).toArray();
    return new Set(entries.map((entry) => entry.date));
  },
  async clearAll() {
    const ids = await appDb.wellnessEntries.toCollection().primaryKeys();
    await appDb.wellnessEntries.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  },
  count: () => appDb.wellnessEntries.count(),
  csv: {
    fileName: "wellness-entries.csv",
    exportLabelKey: "settings_export_wellness_entries",
    generate: async () => generateWellnessEntriesCsv(await appDb.wellnessEntries.orderBy("recordedAt").toArray()),
  },
};
