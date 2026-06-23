import {
  findSpreadsheet,
  createSpreadsheet,
  readSheetColumn,
  appendRowsBatched,
  ensureSheetTabs,
  writeHeaders,
  SHEET_TABS,
} from "./google-sheets";
import type { TableSyncConfig } from "./sync-config";
import { TABLE_SYNC_CONFIGS } from "./sync-config";

export interface SyncTableResult {
  tableName: string;
  total: number;
  found: number;
  appended: number;
  error?: string;
}

export type SyncProgressCallback = (result: SyncTableResult) => void;

/** Sync a single table: compare keys, append missing rows. */
export async function syncTable(
  accessToken: string,
  spreadsheetId: string,
  tableName: string,
  config: TableSyncConfig,
  onProgress: SyncProgressCallback,
): Promise<SyncTableResult> {
  const result: SyncTableResult = {
    tableName,
    total: 0,
    found: 0,
    appended: 0,
  };

  try {
    const allRecords = await config.readFromDb();
    result.total = allRecords.length;

    if (allRecords.length === 0) {
      onProgress(result);
      return result;
    }

    const sheetKeys = await readSheetColumn(
      accessToken,
      spreadsheetId,
      tableName,
    );
    const existingKeys = new Set(sheetKeys);
    result.found = existingKeys.size;

    const newRows = allRecords
      .filter((r) => !existingKeys.has(String(r[config.keyColumn])))
      .map(config.toRow);

    if (newRows.length > 0) {
      const ok = await appendRowsBatched(
        accessToken,
        spreadsheetId,
        tableName,
        config.headers,
        newRows,
      );
      if (!ok) {
        result.error = `Failed to append ${newRows.length} row(s) to ${tableName}`;
      } else {
        result.appended = newRows.length;
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  onProgress(result);
  return result;
}

export interface SyncAllResult {
  success: boolean;
  results: SyncTableResult[];
  spreadsheetId?: string;
}

/** Sync all 6 tables. Returns aggregate result. */
export async function syncAll(
  accessToken: string,
  onProgress?: SyncProgressCallback,
): Promise<SyncAllResult> {
  const cb = onProgress ?? (() => {});
  const results: SyncTableResult[] = [];

  // Step 1: Find or create spreadsheet
  let info = await findSpreadsheet(accessToken);
  if (!info) {
    info = await createSpreadsheet(accessToken);
    if (!info) {
      console.error("[sync] syncAll: could not find or create spreadsheet");
      return {
        success: false,
        results: [
          {
            tableName: "spreadsheet",
            total: 0,
            found: 0,
            appended: 0,
            error: "Failed to create spreadsheet",
          },
        ],
      };
    }
    // Write headers for all tabs on first creation
    for (let i = 0; i < TABLE_SYNC_CONFIGS.length; i++) {
      const config = TABLE_SYNC_CONFIGS[i];
      const sheetName = SHEET_TABS[i];
      const ok = await writeHeaders(accessToken, info.spreadsheetId, sheetName, config.headers);
      if (!ok) {
        return {
          success: false,
          results: [
            {
              tableName: sheetName,
              total: 0,
              found: 0,
              appended: 0,
              error: `Failed to write headers for ${sheetName}`,
            },
          ],
          spreadsheetId: info.spreadsheetId,
        };
      }
    }
  } else {
    // Ensure all tabs exist for existing spreadsheet
    const ok = await ensureSheetTabs(accessToken, info.spreadsheetId);
    if (!ok) {
      return {
        success: false,
        results: [
          {
            tableName: "spreadsheet",
            total: 0,
            found: 0,
            appended: 0,
            error: "Failed to ensure required sheet tabs",
          },
        ],
        spreadsheetId: info.spreadsheetId,
      };
    }
  }

  // Step 2: Sync each table sequentially
  for (let i = 0; i < TABLE_SYNC_CONFIGS.length; i++) {
    const config = TABLE_SYNC_CONFIGS[i];
    const sheetName = SHEET_TABS[i];
    const result = await syncTable(
      accessToken,
      info.spreadsheetId,
      sheetName,
      config,
      cb,
    );
    results.push(result);
  }

  const hasError = results.some((r) => r.error);
  return {
    success: !hasError,
    results,
    spreadsheetId: info.spreadsheetId,
  };
}