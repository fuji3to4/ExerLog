import type { Tombstone } from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { customTabName, recordTypesSyncConfig } from "@/features/modules/custom/data";
import { deleteOrphanRecords, loadCustomTypes } from "@/features/modules/custom/type-store";
import { recordModuleData } from "@/features/modules/data-registry";
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
const ENSURE_TABS_ERROR = "Failed to ensure required sheet tabs";

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
  // Read at call time: custom/data is part of an import cycle with this module.
  const recordTypesTab = recordTypesSyncConfig.tabName;
  const preparedTabs = sheetTabs();
  const spreadsheetId = await prepareSpreadsheet(accessToken, preparedTabs);
  if (typeof spreadsheetId !== "string") {
    return { success: false, results: [spreadsheetId] };
  }

  const results: SyncTableResult[] = [];
  const report = (result: SyncTableResult) => {
    results.push(result);
    onProgress(result);
  };
  const run = async (config: TableSyncConfig, deletedIds: Map<string, string>) => {
    report(await syncTable(accessToken, spreadsheetId, config, deletedIds));
  };

  // 1. Tombstones.
  const initialConfigs = tableSyncConfigs();
  const tombstonesConfig = initialConfigs.find((c) => c.tabName === TOMBSTONES_TAB)!;
  await run(tombstonesConfig, new Map());
  if (results[0].error) {
    // Without the merged tombstones, other tabs could pull deleted records back.
    return { success: false, results, spreadsheetId };
  }

  // 2. File sync (e.g. photos on Drive) sees the merged tombstones, before the other tabs.
  for (const moduleData of recordModuleData()) {
    if (!moduleData.syncFiles) continue;
    let result: SyncTableResult;
    try {
      result = await moduleData.syncFiles(accessToken);
    } catch (err) {
      result = {
        tableName: moduleData.id,
        rowCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    report(result);
  }

  const deletedIdsByTab = groupDeletedIds(await appDb.tombstones.toArray());
  const deletedIdsFor = (config: TableSyncConfig) =>
    config.deletable
      ? (deletedIdsByTab.get(config.tabName) ?? new Map<string, string>())
      : new Map<string, string>();

  // 3. Record-type definitions, so the types pulled here sync their records in this same run.
  const recordTypesConfig = initialConfigs.find((c) => c.tabName === recordTypesTab)!;
  await run(recordTypesConfig, deletedIdsFor(recordTypesConfig));

  // 4. Rebuild the custom types (and with them the module registry and tab list),
  // then drop the local records of types purged on another device.
  try {
    await loadCustomTypes();
    await deleteOrphanRecords();
  } catch (err) {
    report({
      tableName: recordTypesTab,
      rowCount: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5. Add the tabs of newly known types; on failure skip only those tabs.
  const tabs = sheetTabs();
  const addedTabs = new Set(tabs.filter((tab) => !preparedTabs.includes(tab)));
  if (addedTabs.size > 0) {
    if (await ensureSheetTabs(accessToken, spreadsheetId, tabs)) {
      addedTabs.clear();
    } else {
      report({ tableName: "spreadsheet", rowCount: 0, error: ENSURE_TABS_ERROR });
    }
  }

  // 6. Everything else, from the configs rebuilt after the reload.
  for (const config of tableSyncConfigs()) {
    if (config.tabName === TOMBSTONES_TAB || config.tabName === recordTypesTab) continue;
    if (addedTabs.has(config.tabName)) continue;
    await run(config, deletedIdsFor(config));
  }

  // 7. Tabs of purged types: the tab stays, but its tombstoned rows go.
  const configured = new Set(tableSyncConfigs().map((c) => c.tabName));
  const purgedTabs = groupDeletedIds(await appDb.tombstones.toArray());
  for (const [tabName, deletedIds] of purgedTabs) {
    if (!tabName.startsWith(customTabName("")) || configured.has(tabName)) continue;
    const result = await removeTombstonedRows(accessToken, spreadsheetId, tabName, deletedIds);
    if (result) report(result);
  }

  return {
    success: !results.some((r) => r.error),
    results,
    spreadsheetId,
  };
}

/**
 * Rewrite a tab that no longer has a sync config without its tombstoned rows.
 * Local data is not touched. A tab that cannot be read (e.g. it does not
 * exist) is skipped; only a failed write is returned as a result.
 */
async function removeTombstonedRows(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  deletedIds: Map<string, string>,
): Promise<SyncTableResult | null> {
  let rows: string[][];
  try {
    rows = await readAllRows(accessToken, spreadsheetId, tabName);
  } catch {
    return null;
  }
  if (rows.length === 0) return null;
  const idIndex = rows[0].indexOf("id");
  if (idIndex < 0) return null;
  const kept = rows.slice(1).filter((row) => !deletedIds.has(row[idIndex] ?? ""));
  if (kept.length === rows.length - 1) return null;
  const ok = await replaceAllRows(accessToken, spreadsheetId, tabName, [rows[0], ...kept]);
  return ok ? null : { tableName: tabName, rowCount: 0, error: `Failed to write ${tabName}` };
}

/** Returns the spreadsheet id, or a failed result describing what went wrong. */
async function prepareSpreadsheet(
  accessToken: string,
  tabs: readonly string[],
): Promise<string | SyncTableResult> {
  const existing = await findSpreadsheet(accessToken);
  if (existing) {
    const ok = await ensureSheetTabs(accessToken, existing.spreadsheetId, tabs);
    return ok
      ? existing.spreadsheetId
      : { tableName: "spreadsheet", rowCount: 0, error: ENSURE_TABS_ERROR };
  }

  const created = await createSpreadsheet(accessToken, tabs);
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
      const tombstoned = config.deletable
        ? withLocalTombstones(deletedIds, await localDeletedIds(config.tabName))
        : deletedIds;
      const merged = mergeRecords({
        local,
        remote,
        keyColumn: config.keyColumn,
        updatedAtKey: config.updatedAtKey,
        deletedIds: tombstoned,
      });
      if (config.onTombstonedRemote) {
        const droppedRemote = droppedByTombstone(config, remote, merged, tombstoned);
        if (droppedRemote.length > 0) await config.onTombstonedRemote(droppedRemote);
      }
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

/** Remote rows whose key is tombstoned and that the merge left out. */
function droppedByTombstone(
  config: TableSyncConfig,
  remote: any[],
  merged: any[],
  tombstoned: Map<string, string>,
): any[] {
  const kept = new Set(merged.map((record) => String(record[config.keyColumn])));
  return remote.filter((record) => {
    const key = String(record[config.keyColumn]);
    return tombstoned.has(key) && !kept.has(key);
  });
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
