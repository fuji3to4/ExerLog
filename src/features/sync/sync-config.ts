import type { Table } from "dexie";

import type {
  ExerciseIntensity,
  ExerciseLog,
  ExerciseLogResult,
  ExerciseSet,
  ExerciseVideo,
  Tombstone,
  WatchEvent,
} from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { recordModuleData } from "@/features/modules/data-registry";
import { cell, replaceTable } from "./sync-helpers";

/** How one Dexie table is mirrored to one sheet tab. */
export interface TableSyncConfig {
  tabName: string;
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
  /**
   * Optional. Called inside the merge transaction with the remote rows the merge
   * dropped because of a tombstone (rows this device may never have held), e.g.
   * so their external resources can still be cleaned up. Writes only to tables in
   * `syncedDbTables()`.
   */
  onTombstonedRemote?: (records: any[]) => Promise<void>;
}

/** Every Dexie table touched by sync; the merge transaction is opened over these. */
export function syncedDbTables(): Table<any, any>[] {
  return [
    appDb.exerciseLogs,
    ...recordModuleData().flatMap((m) => m.tables()),
    appDb.watchEvents,
    appDb.exercises,
    appDb.exerciseSets,
    appDb.tombstones,
  ];
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

function parseExerciseIds(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

const exerciseSetsConfig: TableSyncConfig = {
  tabName: "ExerciseSets",
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "name", "exerciseIds", "createdAt", "updatedAt"],
  toRow: (r: ExerciseSet) => [r.id, r.name, JSON.stringify(r.exerciseIds), r.createdAt, r.updatedAt],
  fromRow: (row, headers): ExerciseSet => ({
    id: cell(row, headers, "id"),
    name: cell(row, headers, "name"),
    exerciseIds: parseExerciseIds(cell(row, headers, "exerciseIds")),
    createdAt: cell(row, headers, "createdAt"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.exerciseSets.toArray(),
  replaceDb: (records) => replaceTable(appDb.exerciseSets, records as ExerciseSet[]),
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

/**
 * One entry per sheet tab (Tombstones last). A function, not a constant, so
 * the array is built at call time and import cycles never see it half-built
 * (module data files import the sync scheduler).
 */
export function tableSyncConfigs(): TableSyncConfig[] {
  return [
    exerciseLogsConfig,
    ...recordModuleData().flatMap((m) => m.syncConfigs),
    watchEventsConfig,
    exercisesConfig,
    exerciseSetsConfig,
    tombstonesConfig,
  ];
}

/** Sheet tab names, in the order of `tableSyncConfigs()`. */
export function sheetTabs(): string[] {
  return tableSyncConfigs().map((c) => c.tabName);
}
