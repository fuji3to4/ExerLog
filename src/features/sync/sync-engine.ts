import type { Tombstone } from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import {
  createSpreadsheet,
  ensureSheetTabs,
  findSpreadsheet,
  readAllRows,
  replaceAllRows,
} from "./google-sheets";
import { mergeRecords } from "./merge-records";
import type { TableSyncConfig } from "./sync-config";
import { sheetTabs, syncedDbTables, tableSyncConfigs } from "./sync-config";

export interface SyncTableResult {
  tableName: string;
  rowCount: number;
  error?: string;
}

export type SyncProgressCallback = (result: SyncTableResult) => void;

export interface SyncAllResult {
  success: boolean;
  results: SyncTableResult[];
  spreadsheetId?: string;
}

const TOMBSTONES_TAB = "Tombstones";

let activeSyncPromise: Promise<unknown> = Promise.resolve();

/**
 * Merge every table with its sheet tab (last-writer-wins + tombstones) and
 * rewrite each tab with the merged result. Calls are serialized.
 */
export async function syncAll(
  accessToken: string,
  onProgress?: SyncProgressCallback,
): Promise<SyncAllResult> {
  const execute = () => doSyncAll(accessToken, onProgress ?? (() => {}));
  const nextPromise = activeSyncPromise.then(execute, execute);
  activeSyncPromise = nextPromise;
  return nextPromise;
}

async function doSyncAll(
  accessToken: string,
  onProgress: SyncProgressCallback,
): Promise<SyncAllResult> {
  const spreadsheetId = await prepareSpreadsheet(accessToken);
  if (typeof spreadsheetId !== "string") {
    return { success: false, results: [spreadsheetId] };
  }

  const results: SyncTableResult[] = [];
  const run = async (config: TableSyncConfig, deletedIds: Map<string, string>) => {
    const result = await syncTable(accessToken, spreadsheetId, config, deletedIds);
    results.push(result);
    onProgress(result);
  };

  const configs = tableSyncConfigs();
  const tombstonesConfig = configs.find((c) => c.tabName === TOMBSTONES_TAB)!;
  await run(tombstonesConfig, new Map());
  if (results[0].error) {
    // Without the merged tombstones, other tabs could pull deleted records back.
    return { success: false, results, spreadsheetId };
  }

  const deletedIdsByTab = groupDeletedIds(await appDb.tombstones.toArray());
  for (const config of configs) {
    if (config === tombstonesConfig) continue;
    const deletedIds = config.deletable
      ? (deletedIdsByTab.get(config.tabName) ?? new Map<string, string>())
      : new Map<string, string>();
    await run(config, deletedIds);
  }

  return {
    success: !results.some((r) => r.error),
    results,
    spreadsheetId,
  };
}

/** Returns the spreadsheet id, or a failed result describing what went wrong. */
async function prepareSpreadsheet(accessToken: string): Promise<string | SyncTableResult> {
  const existing = await findSpreadsheet(accessToken);
  if (existing) {
    const ok = await ensureSheetTabs(accessToken, existing.spreadsheetId, sheetTabs());
    return ok
      ? existing.spreadsheetId
      : { tableName: "spreadsheet", rowCount: 0, error: "Failed to ensure required sheet tabs" };
  }

  const created = await createSpreadsheet(accessToken, sheetTabs());
  if (!created) {
    console.error("[sync] syncAll: could not find or create spreadsheet");
    return { tableName: "spreadsheet", rowCount: 0, error: "Failed to create spreadsheet" };
  }
  return created.spreadsheetId;
}

/** Tab name → (recordId → deletedAt). */
function groupDeletedIds(tombstones: Tombstone[]): Map<string, Map<string, string>> {
  const byTab = new Map<string, Map<string, string>>();
  for (const tombstone of tombstones) {
    const ids = byTab.get(tombstone.table) ?? new Map<string, string>();
    ids.set(tombstone.recordId, tombstone.deletedAt);
    byTab.set(tombstone.table, ids);
  }
  return byTab;
}

/** Local tombstones for one tab, as recordId → deletedAt. */
async function localDeletedIds(tabName: string): Promise<Map<string, string>> {
  const tombstones = await appDb.tombstones.where("table").equals(tabName).toArray();
  return groupDeletedIds(tombstones).get(tabName) ?? new Map<string, string>();
}

/**
 * Union of the tombstones merged at the start of the run and those recorded
 * locally since (e.g. a delete while this sync was running), latest deletedAt wins.
 */
function withLocalTombstones(
  merged: Map<string, string>,
  local: Map<string, string>,
): Map<string, string> {
  const result = new Map(merged);
  for (const [recordId, deletedAt] of local) {
    const existing = result.get(recordId);
    if (existing === undefined || Date.parse(deletedAt) > Date.parse(existing)) {
      result.set(recordId, deletedAt);
    }
  }
  return result;
}

/**
 * Merge one tab: read the sheet, merge with local inside a rw transaction
 * (re-reading local records and tombstones there so records added or deleted
 * meanwhile are neither lost nor resurrected), replace
 * the local table, then rewrite the whole tab from the stored result.
 */
async function syncTable(
  accessToken: string,
  spreadsheetId: string,
  config: TableSyncConfig,
  deletedIds: Map<string, string>,
): Promise<SyncTableResult> {
  const result: SyncTableResult = { tableName: config.tabName, rowCount: 0 };

  try {
    const remote = parseRemoteRows(config, await readAllRows(accessToken, spreadsheetId, config.tabName));

    const stored = await appDb.transaction("rw", syncedDbTables(), async () => {
      const local = await config.readFromDb();
      const merged = mergeRecords({
        local,
        remote,
        keyColumn: config.keyColumn,
        updatedAtKey: config.updatedAtKey,
        deletedIds: config.deletable
          ? withLocalTombstones(deletedIds, await localDeletedIds(config.tabName))
          : deletedIds,
      });
      await config.replaceDb(merged);
      return config.readFromDb();
    });
    result.rowCount = stored.length;

    const headers = isByName(config) ? config.buildHeaders!(stored) : config.headers;
    const ok = await replaceAllRows(accessToken, spreadsheetId, config.tabName, [
      headers,
      ...stored.map((record) => config.toRow(record, headers)),
    ]);
    if (!ok) {
      result.error = `Failed to write ${config.tabName}`;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

function isByName(config: TableSyncConfig): boolean {
  return config.headerMode === "byName";
}

/**
 * Turn sheet rows into records; rows with an empty key are skipped.
 * exact: a tab whose header row differs from `config.headers` (e.g. an old
 * format) is treated as empty. byName: the tab is read under its own header
 * row, unless that row lacks one of `config.headers`, in which case it is
 * treated as empty.
 */
function parseRemoteRows(config: TableSyncConfig, rows: string[][]): any[] {
  if (rows.length === 0) return [];
  const actual = rows[0];
  const readable = isByName(config)
    ? config.headers.every((column) => actual.includes(column))
    : sameHeaders(actual, config.headers);
  if (!readable) return [];

  const headers = isByName(config) ? actual : config.headers;
  const keyIndex = headers.indexOf(config.keyColumn);
  return rows
    .slice(1)
    .filter((row) => (row[keyIndex] ?? "") !== "")
    .map((row) => config.fromRow(row, headers));
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((value, i) => value === expected[i]);
}
