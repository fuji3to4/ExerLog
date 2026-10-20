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
import { syncedDbTables, TABLE_SYNC_CONFIGS } from "./sync-config";

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

  const tombstonesConfig = TABLE_SYNC_CONFIGS.find((c) => c.tabName === TOMBSTONES_TAB)!;
  await run(tombstonesConfig, new Map());
  if (results[0].error) {
    // Without the merged tombstones, other tabs could pull deleted records back.
    return { success: false, results, spreadsheetId };
  }

  const deletedIdsByTab = groupDeletedIds(await appDb.tombstones.toArray());
  for (const config of TABLE_SYNC_CONFIGS) {
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
    const ok = await ensureSheetTabs(accessToken, existing.spreadsheetId);
    return ok
      ? existing.spreadsheetId
      : { tableName: "spreadsheet", rowCount: 0, error: "Failed to ensure required sheet tabs" };
  }

  const created = await createSpreadsheet(accessToken);
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

/**
 * Merge one tab: read the sheet, merge with local inside a rw transaction
 * (re-reading local there so records added meanwhile are not lost), replace
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
        deletedIds,
      });
      await config.replaceDb(merged);
      return config.readFromDb();
    });
    result.rowCount = stored.length;

    const ok = await replaceAllRows(accessToken, spreadsheetId, config.tabName, [
      config.headers,
      ...stored.map(config.toRow),
    ]);
    if (!ok) {
      result.error = `Failed to write ${config.tabName}`;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

/**
 * Turn sheet rows into records. A tab whose header row differs from
 * `config.headers` (e.g. an old format) is treated as empty; rows with an
 * empty key are skipped.
 */
function parseRemoteRows(config: TableSyncConfig, rows: string[][]): any[] {
  if (rows.length === 0 || !sameHeaders(rows[0], config.headers)) {
    return [];
  }
  const keyIndex = config.headers.indexOf(config.keyColumn);
  return rows
    .slice(1)
    .filter((row) => (row[keyIndex] ?? "") !== "")
    .map((row) => config.fromRow(row, config.headers));
}

function sameHeaders(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((value, i) => value === expected[i]);
}
