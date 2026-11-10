import type { CustomRecord, CustomRecordType, CustomValue } from "@/lib/types";

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
import { FIXED_COLUMNS, parseDefinition, type CustomRecordDefinition } from "./definition";
import { decodeCell, encodeCell, normalizeValues } from "./values";

const FIXED: readonly string[] = FIXED_COLUMNS;

export function customModuleId(typeId: string): string {
  return `custom:${typeId}`;
}

export function customTabName(typeId: string): string {
  return `Custom_${typeId}`;
}

export type CustomRecordInput = Pick<CustomRecord, "date" | "recordedAt" | "values" | "note">;

export async function addCustomRecord(
  definition: CustomRecordDefinition,
  input: CustomRecordInput,
): Promise<CustomRecord> {
  const record: CustomRecord = {
    id: crypto.randomUUID(),
    typeId: definition.id,
    date: input.date,
    recordedAt: input.recordedAt,
    values: normalizeValues(definition, input.values),
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.customRecords.add(record);
  scheduleSync();
  return record;
}

/** Values of fields no longer in the definition are kept from the stored record. */
export async function updateCustomRecord(definition: CustomRecordDefinition, record: CustomRecord): Promise<void> {
  const stored = await appDb.customRecords.get(record.id);
  const known = new Set(definition.fields.map((f) => f.id));
  const kept: Record<string, CustomValue> = {};
  for (const [id, value] of Object.entries(stored?.values ?? {})) {
    if (!known.has(id)) kept[id] = value;
  }
  await appDb.customRecords.put({
    ...record,
    typeId: definition.id,
    values: { ...kept, ...normalizeValues(definition, record.values) },
    note: record.note.trim(),
    updatedAt: localIsoNow(),
  });
  scheduleSync();
}

export async function deleteCustomRecord(typeId: string, id: string): Promise<void> {
  await appDb.transaction("rw", appDb.customRecords, appDb.tombstones, async () => {
    await appDb.customRecords.delete(id);
    await recordTombstones(customTabName(typeId), [id]);
  });
  scheduleSync();
}

/** Records of one type whose date is within [start, end] (inclusive day keys), oldest first. */
export function listCustomInRange(typeId: string, start: string, end: string): Promise<CustomRecord[]> {
  return appDb.customRecords
    .where("[typeId+date]")
    .between([typeId, start], [typeId, end], true, true)
    .sortBy("recordedAt");
}

function sheetHeaders(definition: CustomRecordDefinition, records: CustomRecord[]): string[] {
  const listed = definition.fields.map((f) => f.id);
  const unknown = new Set<string>();
  for (const record of records) {
    for (const id of Object.keys(record.values)) {
      if (!listed.includes(id) && !FIXED.includes(id)) unknown.add(id);
    }
  }
  return [...FIXED, ...listed, ...[...unknown].sort()];
}

function createRecordsSyncConfig(definition: CustomRecordDefinition): TableSyncConfig {
  const typeId = definition.id;
  const fields = new Map(definition.fields.map((f) => [f.id, f]));
  return {
    tabName: customTabName(typeId),
    keyColumn: "id",
    updatedAtKey: "updatedAt",
    deletable: true,
    headerMode: "byName",
    headers: [...FIXED],
    buildHeaders: (records) => sheetHeaders(definition, records as CustomRecord[]),
    toRow: (r: CustomRecord, headers) =>
      headers.map((column) => {
        switch (column) {
          case "id":
            return r.id;
          case "date":
            return r.date;
          case "recordedAt":
            return r.recordedAt;
          case "note":
            return r.note ?? "";
          case "updatedAt":
            return r.updatedAt;
          default:
            return encodeCell(r.values[column]);
        }
      }),
    fromRow: (row, headers): CustomRecord => {
      const values: Record<string, CustomValue> = {};
      headers.forEach((column, index) => {
        if (column === "" || FIXED.includes(column)) return;
        const value = decodeCell(fields.get(column), (row[index] ?? "").trim());
        if (value !== undefined) values[column] = value;
      });
      return {
        id: cell(row, headers, "id"),
        typeId,
        date: cell(row, headers, "date"),
        recordedAt: cell(row, headers, "recordedAt"),
        values,
        note: cell(row, headers, "note"),
        updatedAt: cell(row, headers, "updatedAt"),
      };
    },
    readFromDb: () => appDb.customRecords.where("typeId").equals(typeId).toArray(),
    // The table is shared by every type: replace only this type's rows.
    replaceDb: async (records) => {
      await appDb.customRecords.where("typeId").equals(typeId).delete();
      if (records.length > 0) await appDb.customRecords.bulkPut(records as CustomRecord[]);
    },
  };
}

export function createCustomModuleData(type: CustomRecordType): RecordModuleData<CustomRecord> {
  const definition = type.definition;
  const typeId = definition.id;
  const tabName = customTabName(typeId);
  const own = () => appDb.customRecords.where("typeId").equals(typeId);
  return {
    id: customModuleId(typeId),
    syncConfigs: [createRecordsSyncConfig(definition)],
    tables: () => [appDb.customRecords],
    listForDay: (date) => appDb.customRecords.where("[typeId+date]").equals([typeId, date]).sortBy("recordedAt"),
    async listInPeriod(period) {
      const { start, end } = periodDayKeys(period);
      const records = await listCustomInRange(typeId, start, end);
      return records.filter((r) => isWithinPeriod(r.recordedAt, period));
    },
    async datesWithRecordsInMonth(month) {
      const records = await appDb.customRecords
        .where("[typeId+date]")
        .between([typeId, `${month}-00`], [typeId, `${month}-99`], true, true)
        .toArray();
      return new Set(records.map((r) => r.date));
    },
    async clearAll() {
      const ids = await own().primaryKeys();
      await own().delete();
      await recordTombstones(tabName, ids);
    },
    count: () => own().count(),
    csv: {
      fileName: `custom-${definition.id}.csv`,
      exportLabel: { text: definition.name },
      generate: async () => {
        const records = await own().sortBy("recordedAt");
        const headers = sheetHeaders(definition, records).filter((c) => c !== "updatedAt");
        return toCsv(
          headers,
          records.map((r) =>
            headers.map((column) => {
              switch (column) {
                case "id":
                  return r.id;
                case "date":
                  return r.date;
                case "recordedAt":
                  return formatTimestampForCsv(r.recordedAt);
                case "note":
                  return r.note ?? "";
                default:
                  return encodeCell(r.values[column]);
              }
            }),
          ),
        );
      },
    },
  };
}

/** Definitions of the custom record types (tab RecordTypes). */
export const recordTypesSyncConfig: TableSyncConfig = {
  tabName: "RecordTypes",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "definition", "deleted", "updatedAt"],
  toRow: (r: CustomRecordType) => [
    r.id,
    typeof r.definition === "string" ? r.definition : JSON.stringify(r.definition),
    r.deleted ? "1" : "",
    r.updatedAt,
  ],
  fromRow: (row, headers): CustomRecordType => {
    const raw = cell(row, headers, "definition");
    let definition: unknown = raw;
    try {
      const parsed = parseDefinition(JSON.parse(raw));
      if (parsed.ok) definition = parsed.definition;
    } catch {
      // Keep the raw text so the row still syncs; the store skips what it cannot use.
    }
    return {
      id: cell(row, headers, "id"),
      definition: definition as CustomRecordDefinition,
      deleted: cell(row, headers, "deleted") === "1",
      updatedAt: cell(row, headers, "updatedAt"),
    };
  },
  readFromDb: () => appDb.customRecordTypes.toArray(),
  replaceDb: (records) => replaceTable(appDb.customRecordTypes, records as CustomRecordType[]),
};
