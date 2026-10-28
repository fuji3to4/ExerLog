import type { SymptomEntry, SymptomRecord } from "@/lib/types";

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
import { BODY_SITES, parseSymptomCells, SYMPTOMS, SYMPTOM_COLUMNS, symptomCells } from "./columns";

const TOMBSTONE_TABLE = "Symptoms";

export type AddSymptomRecordInput = Pick<SymptomRecord, "date" | "recordedAt" | "symptoms" | "note">;

/** Symptoms in SYMPTOMS order, each with sites in BODY_SITES order. */
function normalizeSymptoms(symptoms: SymptomEntry[]): SymptomEntry[] {
  return SYMPTOMS.flatMap((id) => {
    const entry = symptoms.find((s) => s.id === id);
    return entry ? [{ ...entry, sites: BODY_SITES.filter((site) => entry.sites.includes(site)) }] : [];
  });
}

export async function addSymptomRecord(input: AddSymptomRecordInput): Promise<SymptomRecord> {
  const record: SymptomRecord = {
    id: crypto.randomUUID(),
    date: input.date,
    recordedAt: input.recordedAt,
    symptoms: normalizeSymptoms(input.symptoms),
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.symptomRecords.add(record);
  scheduleSync();
  return record;
}

export async function updateSymptomRecord(record: SymptomRecord): Promise<void> {
  await appDb.symptomRecords.put({
    ...record,
    symptoms: normalizeSymptoms(record.symptoms),
    note: record.note.trim(),
    updatedAt: localIsoNow(),
  });
  scheduleSync();
}

export async function deleteSymptomRecord(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.symptomRecords, appDb.tombstones, async () => {
    await appDb.symptomRecords.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Records whose date is within [start, end] (inclusive day keys), oldest first. */
export function listSymptomsInRange(start: string, end: string): Promise<SymptomRecord[]> {
  return appDb.symptomRecords.where("date").between(start, end, true, true).sortBy("recordedAt");
}

function listSymptomsForDay(date: string): Promise<SymptomRecord[]> {
  return appDb.symptomRecords.where("date").equals(date).sortBy("recordedAt");
}

export function generateSymptomsCsv(records: SymptomRecord[]): string {
  return toCsv(
    ["date", "recordedAt", "note", ...SYMPTOM_COLUMNS],
    records.map((r) => [r.date, formatTimestampForCsv(r.recordedAt), r.note, ...symptomCells(r.symptoms)]),
  );
}

const symptomsConfig: TableSyncConfig = {
  tabName: TOMBSTONE_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "recordedAt", "note", "updatedAt", ...SYMPTOM_COLUMNS],
  toRow: (r: SymptomRecord) => [r.id, r.date, r.recordedAt, r.note ?? "", r.updatedAt, ...symptomCells(r.symptoms)],
  fromRow: (row, headers): SymptomRecord => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    recordedAt: cell(row, headers, "recordedAt"),
    symptoms: parseSymptomCells(row, headers),
    note: cell(row, headers, "note"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.symptomRecords.toArray(),
  replaceDb: (records) => replaceTable(appDb.symptomRecords, records as SymptomRecord[]),
};

export const symptomsData: RecordModuleData<SymptomRecord> = {
  id: "symptoms",
  syncConfigs: [symptomsConfig],
  tables: () => [appDb.symptomRecords],
  listForDay: listSymptomsForDay,
  async listInPeriod(period) {
    const { start, end } = periodDayKeys(period);
    const records = await listSymptomsInRange(start, end);
    return records.filter((r) => isWithinPeriod(r.recordedAt, period));
  },
  async datesWithRecordsInMonth(month) {
    const records = await appDb.symptomRecords.where("date").startsWith(month).toArray();
    return new Set(records.map((r) => r.date));
  },
  async clearAll() {
    const ids = await appDb.symptomRecords.toCollection().primaryKeys();
    await appDb.symptomRecords.clear();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  },
  count: () => appDb.symptomRecords.count(),
  csv: {
    fileName: "symptoms.csv",
    exportLabelKey: "settings_export_symptoms",
    generate: async () => generateSymptomsCsv(await appDb.symptomRecords.orderBy("recordedAt").toArray()),
  },
};
