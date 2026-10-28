import { GOOGLE_NAMES } from "./google-names";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SpreadsheetInfo {
  spreadsheetId: string;
}

/** Search Drive for the spreadsheet named GOOGLE_NAMES.spreadsheet. Returns first match or null. */
export async function findSpreadsheet(
  accessToken: string,
): Promise<SpreadsheetInfo | null> {
  try {
    const q = `name='${GOOGLE_NAMES.spreadsheet}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id%2Cname)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error("[sync] findSpreadsheet failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (!data.files?.length) return null;
    return { spreadsheetId: data.files[0].id };
  } catch (err) {
    console.error("[sync] findSpreadsheet threw", err);
    return null;
  }
}

/** Create a new spreadsheet with every sheet tab. */
export async function createSpreadsheet(
  accessToken: string,
  tabs: readonly string[],
): Promise<SpreadsheetInfo | null> {
  try {
    const body = {
      properties: { title: GOOGLE_NAMES.spreadsheet },
      sheets: tabs.map((title) => ({ properties: { title } })),
    };
    const res = await fetch(`${SHEETS_API}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[sync] createSpreadsheet failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return { spreadsheetId: data.spreadsheetId };
  } catch (err) {
    console.error("[sync] createSpreadsheet threw", err);
    return null;
  }
}

/**
 * Read ALL rows from a sheet tab (including header). Returns string[][] with
 * first row = header, or [] for an empty tab. Throws when the request fails so
 * that a failed read is never mistaken for an empty sheet.
 */
export async function readAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  const range = encodeURIComponent(`${sheetName}!A:ZZ`);
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Failed to read ${sheetName} (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.values ?? [];
}

/** Ensure every sheet tab exists. Creates missing ones via batchUpdate. */
export async function ensureSheetTabs(
  accessToken: string,
  spreadsheetId: string,
  tabs: readonly string[],
): Promise<boolean> {
  try {
    const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const existingTabs = new Set(
      data.sheets?.map((s: any) => s.properties.title) ?? [],
    );
    const missingTabs = tabs.filter((t) => !existingTabs.has(t));
    if (missingTabs.length === 0) return true;

    const batchBody = {
      requests: missingTabs.map((title) => ({
        addSheet: { properties: { title } },
      })),
    };
    const batchRes = await fetch(
      `${SHEETS_API}/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchBody),
      },
    );
    return batchRes.ok;
  } catch {
    return false;
  }
}

/**
 * Make sure a sheet tab has at least `neededColumns` columns, appending columns
 * when it is narrower (new tabs default to 26, A–Z). Writing past the grid
 * fails with "exceeds grid limits", so this must succeed before any clear.
 */
async function ensureColumnCount(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  neededColumns: number,
): Promise<boolean> {
  const fields = encodeURIComponent("sheets.properties(sheetId,title,gridProperties.columnCount)");
  const metaRes = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    console.error("[sync] replaceAllRows column check failed", sheetName, metaRes.status);
    return false;
  }
  const data = await metaRes.json();
  const properties = data.sheets
    ?.map((s: any) => s.properties)
    .find((p: any) => p?.title === sheetName);
  if (!properties) {
    console.error("[sync] replaceAllRows tab not found", sheetName);
    return false;
  }
  const columnCount: number = properties.gridProperties?.columnCount ?? 0;
  if (neededColumns <= columnCount) return true;

  const growRes = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          appendDimension: {
            sheetId: properties.sheetId,
            dimension: "COLUMNS",
            length: neededColumns - columnCount,
          },
        },
      ],
    }),
  });
  if (!growRes.ok) {
    console.error("[sync] replaceAllRows column grow failed", sheetName, growRes.status);
    return false;
  }
  return true;
}

/**
 * Replace the whole content of a sheet tab: widen the tab when the rows need
 * more columns than it has, clear A:ZZ, then write `rows` (header row
 * included) starting at A1. RAW keeps every value a plain string. Nothing is
 * cleared unless the tab is wide enough for the write.
 */
export async function replaceAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
): Promise<boolean> {
  try {
    const neededColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (!(await ensureColumnCount(accessToken, spreadsheetId, sheetName, neededColumns))) {
      return false;
    }

    const clearRange = encodeURIComponent(`${sheetName}!A:ZZ`);
    const clearRes = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${clearRange}:clear`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!clearRes.ok) {
      console.error("[sync] replaceAllRows clear failed", sheetName, clearRes.status);
      return false;
    }

    const writeRange = encodeURIComponent(`${sheetName}!A1`);
    const writeRes = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${writeRange}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      },
    );
    if (!writeRes.ok) {
      console.error("[sync] replaceAllRows write failed", sheetName, writeRes.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sync] replaceAllRows threw", err);
    return false;
  }
}
