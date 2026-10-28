import { cell, replaceTable } from "@/features/sync/sync-helpers";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import type { MeasurementRecord } from "@/lib/types";
import { MEASUREMENT_FIXED_COLUMNS, type MeasurementItem } from "./measurement-items";
import type { MeasurementRepository } from "./measurement-repository";

const FIXED: readonly string[] = MEASUREMENT_FIXED_COLUMNS;

/**
 * Mirrors one measurement table to one sheet tab. Columns are matched by name:
 * the fixed columns, then `items` in order, then ids found only in records (sorted).
 */
export function createMeasurementSyncConfig({
  tabName,
  items,
  repository,
}: {
  tabName: string;
  items: readonly MeasurementItem[];
  repository: MeasurementRepository;
}): TableSyncConfig {
  function buildHeaders(records: MeasurementRecord[]): string[] {
    const listed = items.map((item) => item.id);
    const unknown = new Set<string>();
    for (const record of records) {
      for (const id of Object.keys(record.values)) {
        if (!listed.includes(id) && !FIXED.includes(id)) unknown.add(id);
      }
    }
    return [...FIXED, ...listed, ...[...unknown].sort()];
  }

  return {
    tabName,
    keyColumn: "id",
    updatedAtKey: "updatedAt",
    deletable: true,
    headerMode: "byName",
    headers: [...FIXED],
    buildHeaders: (records) => buildHeaders(records as MeasurementRecord[]),
    toRow: (r: MeasurementRecord, headers) =>
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
            return column in r.values ? String(r.values[column]) : "";
        }
      }),
    fromRow: (row, headers): MeasurementRecord => {
      const values: Record<string, number> = {};
      headers.forEach((column, index) => {
        if (column === "" || FIXED.includes(column)) return;
        const raw = (row[index] ?? "").trim();
        const value = Number(raw);
        // An empty cell means "no value", not 0; non-numeric text is dropped.
        if (raw !== "" && Number.isFinite(value)) values[column] = value;
      });
      return {
        id: cell(row, headers, "id"),
        date: cell(row, headers, "date"),
        recordedAt: cell(row, headers, "recordedAt"),
        values,
        note: cell(row, headers, "note"),
        updatedAt: cell(row, headers, "updatedAt"),
      };
    },
    readFromDb: () => repository.table.toArray(),
    replaceDb: (records) => replaceTable(repository.table, records as MeasurementRecord[]),
  };
}
