import type { Table } from "dexie";

import type {
  DailySelfCareEntry,
  ExerciseIntensity,
  ExerciseLog,
  ExerciseLogResult,
  ExerciseVideo,
  MeasurementRecord,
  SelfCareItem,
  Tombstone,
  WatchEvent,
  WellnessEntry,
  WellnessScore,
} from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { MEASUREMENT_FIXED_COLUMNS, MEASUREMENT_ITEMS } from "@/features/measurements/measurement-items";
import type { SheetTab } from "./google-sheets";

/** How one Dexie table is mirrored to one sheet tab. */
export interface TableSyncConfig {
  tabName: SheetTab;
  keyColumn: string;
  /** Field used for last-writer-wins; null means local always wins. */
  updatedAtKey: string | null;
  /** Whether tombstones for this tab remove records (false only for Tombstones). */
  deletable: boolean;
  /**
   * "exact" (default): the sheet header row must equal `headers`, otherwise the
   * tab is read as empty. "byName": columns are matched by header name; the tab
   * is read as long as its header row contains every column in `headers`.
   */
  headerMode?: "exact" | "byName";
  /** exact: the header row. byName: the columns a sheet must have to be read. */
  headers: string[];
  /** byName only: the header row written for `records` (the merged result). */
  buildHeaders?: (records: any[]) => string[];
  /** Cells in the order of `headers` (the row actually written). */
  toRow: (record: any, headers: string[]) => string[];
  /** `headers` is the header row the row was read under. */
  fromRow: (row: string[], headers: string[]) => any;
  readFromDb: () => Promise<any[]>;
  /**
   * Replace the whole local table with `records`. Writes straight to Dexie
   * (no repositories) so syncing never records tombstones or schedules a sync.
   */
  replaceDb: (records: any[]) => Promise<void>;
}

/** Every Dexie table touched by sync; the merge transaction is opened over these. */
export function syncedDbTables(): Table<any, any>[] {
  return [
    appDb.exerciseLogs,
    appDb.wellnessEntries,
    appDb.watchEvents,
    appDb.measurements,
    appDb.dailySelfCareLogs,
    appDb.exercises,
    appDb.selfCareCatalog,
    appDb.tombstones,
  ];
}

function cell(row: string[], headers: string[], column: string): string {
  return row[headers.indexOf(column)] ?? "";
}

function nullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

async function replaceTable<T>(table: Table<T, any>, records: T[]): Promise<void> {
  await table.clear();
  if (records.length > 0) {
    await table.bulkPut(records);
  }
}

/**
 * Keeps one record per `uniqueKey` (the latest by `timeKey`) so that a merge of
 * two devices' records cannot violate a compound unique index such as
 * &[date+metricType].
 */
function keepLatestPerKey<T extends Record<string, any>>(
  records: T[],
  uniqueKey: (record: T) => string,
  timeKey: keyof T,
): T[] {
  const byKey = new Map<string, T>();
  for (const record of records) {
    const key = uniqueKey(record);
    const current = byKey.get(key);
    if (!current || Date.parse(record[timeKey]) > Date.parse(current[timeKey])) {
      byKey.set(key, record);
    }
  }
  return [...byKey.values()];
}

const exerciseLogsConfig: TableSyncConfig = {
  tabName: "ExerciseLogs",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "exerciseId", "result", "performedAt", "durationSeconds", "updatedAt"],
  toRow: (r: ExerciseLog) => [
    r.id,
    r.date,
    r.exerciseId,
    r.result,
    r.performedAt,
    String(r.durationSeconds),
    r.updatedAt,
  ],
  fromRow: (row, headers): ExerciseLog => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    exerciseId: cell(row, headers, "exerciseId"),
    result: cell(row, headers, "result") as ExerciseLogResult,
    performedAt: cell(row, headers, "performedAt"),
    durationSeconds: Number(cell(row, headers, "durationSeconds")),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.exerciseLogs.toArray(),
  replaceDb: (records) => replaceTable(appDb.exerciseLogs, records as ExerciseLog[]),
};

const wellnessEntriesConfig: TableSyncConfig = {
  tabName: "WellnessEntries",
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

const watchEventsConfig: TableSyncConfig = {
  tabName: "WatchEvents",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "exerciseId", "watchedAt", "updatedAt"],
  toRow: (r: WatchEvent) => [r.id, r.date, r.exerciseId, r.watchedAt, r.updatedAt],
  fromRow: (row, headers): WatchEvent => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    exerciseId: cell(row, headers, "exerciseId"),
    watchedAt: cell(row, headers, "watchedAt"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.watchEvents.toArray(),
  replaceDb: (records) => replaceTable(appDb.watchEvents, records as WatchEvent[]),
};

const MEASUREMENT_FIXED: readonly string[] = MEASUREMENT_FIXED_COLUMNS;

/** Fixed columns, then the item list in order, then ids found only in records (sorted). */
function measurementHeaders(records: MeasurementRecord[]): string[] {
  const listed = MEASUREMENT_ITEMS.map((item) => item.id);
  const unknown = new Set<string>();
  for (const record of records) {
    for (const id of Object.keys(record.values)) {
      if (!listed.includes(id) && !MEASUREMENT_FIXED.includes(id)) unknown.add(id);
    }
  }
  return [...MEASUREMENT_FIXED, ...listed, ...[...unknown].sort()];
}

const measurementsConfig: TableSyncConfig = {
  tabName: "Measurements",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headerMode: "byName",
  headers: [...MEASUREMENT_FIXED],
  buildHeaders: (records) => measurementHeaders(records as MeasurementRecord[]),
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
      if (column === "" || MEASUREMENT_FIXED.includes(column)) return;
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
  readFromDb: () => appDb.measurements.toArray(),
  replaceDb: (records) => replaceTable(appDb.measurements, records as MeasurementRecord[]),
};

const dailySelfCareConfig: TableSyncConfig = {
  tabName: "DailySelfCare",
  keyColumn: "id",
  updatedAtKey: "recordedAt",
  deletable: true,
  headers: ["id", "date", "selfCareId", "isDone", "count", "minutes", "note", "recordedAt"],
  toRow: (r: DailySelfCareEntry) => [
    r.id,
    r.date,
    r.selfCareId,
    r.isDone ? "TRUE" : "FALSE",
    r.count != null ? String(r.count) : "",
    r.minutes != null ? String(r.minutes) : "",
    r.note ?? "",
    r.recordedAt,
  ],
  fromRow: (row, headers): DailySelfCareEntry => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    selfCareId: cell(row, headers, "selfCareId"),
    isDone: cell(row, headers, "isDone") === "TRUE",
    count: nullableNumber(cell(row, headers, "count")),
    minutes: nullableNumber(cell(row, headers, "minutes")),
    note: cell(row, headers, "note"),
    recordedAt: cell(row, headers, "recordedAt"),
  }),
  readFromDb: () => appDb.dailySelfCareLogs.toArray(),
  // Unique index &[date+selfCareId]
  replaceDb: (records) =>
    replaceTable(
      appDb.dailySelfCareLogs,
      keepLatestPerKey(
        records as DailySelfCareEntry[],
        (r) => `${r.date}|${r.selfCareId}`,
        "recordedAt",
      ),
    ),
};

const exercisesConfig: TableSyncConfig = {
  tabName: "Exercises",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: [
    "id",
    "title",
    "description",
    "videoUrl",
    "thumbnailUrl",
    "bodyArea",
    "purpose",
    "durationSeconds",
    "intensity",
    "updatedAt",
  ],
  toRow: (r: ExerciseVideo) => [
    r.id,
    r.title,
    r.description ?? "",
    r.videoUrl,
    r.thumbnailUrl ?? "",
    r.bodyArea,
    r.purpose,
    String(r.durationSeconds),
    r.intensity,
    r.updatedAt,
  ],
  fromRow: (row, headers): ExerciseVideo => ({
    id: cell(row, headers, "id"),
    title: cell(row, headers, "title"),
    description: cell(row, headers, "description"),
    videoUrl: cell(row, headers, "videoUrl"),
    thumbnailUrl: cell(row, headers, "thumbnailUrl"),
    bodyArea: cell(row, headers, "bodyArea"),
    purpose: cell(row, headers, "purpose"),
    durationSeconds: Number(cell(row, headers, "durationSeconds")),
    intensity: cell(row, headers, "intensity") as ExerciseIntensity,
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.exercises.toArray(),
  replaceDb: (records) => replaceTable(appDb.exercises, records as ExerciseVideo[]),
};

const selfCareCatalogConfig: TableSyncConfig = {
  tabName: "SelfCareCatalog",
  keyColumn: "id",
  updatedAtKey: null,
  deletable: true,
  headers: ["id", "title", "description", "sortOrder", "isArchived"],
  toRow: (r: SelfCareItem) => [
    r.id,
    r.title,
    r.description ?? "",
    String(r.sortOrder),
    r.isArchived ? "TRUE" : "FALSE",
  ],
  fromRow: (row, headers): SelfCareItem => ({
    id: cell(row, headers, "id"),
    title: cell(row, headers, "title"),
    description: cell(row, headers, "description"),
    sortOrder: Number(cell(row, headers, "sortOrder")),
    isArchived: cell(row, headers, "isArchived") === "TRUE",
  }),
  readFromDb: () => appDb.selfCareCatalog.toArray(),
  replaceDb: (records) => replaceTable(appDb.selfCareCatalog, records as SelfCareItem[]),
};

const tombstonesConfig: TableSyncConfig = {
  tabName: "Tombstones",
  keyColumn: "id",
  updatedAtKey: "deletedAt",
  deletable: false,
  headers: ["id", "table", "recordId", "deletedAt"],
  toRow: (r: Tombstone) => [r.id, r.table, r.recordId, r.deletedAt],
  fromRow: (row, headers): Tombstone => ({
    id: cell(row, headers, "id"),
    table: cell(row, headers, "table"),
    recordId: cell(row, headers, "recordId"),
    deletedAt: cell(row, headers, "deletedAt"),
  }),
  readFromDb: () => appDb.tombstones.toArray(),
  replaceDb: (records) => replaceTable(appDb.tombstones, records as Tombstone[]),
};

/** One entry per sheet tab, in SHEET_TABS order. */
export const TABLE_SYNC_CONFIGS: TableSyncConfig[] = [
  exerciseLogsConfig,
  wellnessEntriesConfig,
  watchEventsConfig,
  measurementsConfig,
  dailySelfCareConfig,
  exercisesConfig,
  selfCareCatalogConfig,
  tombstonesConfig,
];
