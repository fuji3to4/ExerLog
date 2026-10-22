const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export const SHEET_TABS = [
  "ExerciseLogs",
  "WellnessEntries",
  "WatchEvents",
  "Measurements",
  "DailySelfCare",
  "Exercises",
  "SelfCareCatalog",
  "Tombstones",
] as const;

export type SheetTab = (typeof SHEET_TABS)[number];

export interface SpreadsheetInfo {
  spreadsheetId: string;
}

/** Search Drive for a file named "ExerLog Data". Returns first match or null. */
export async function findSpreadsheet(
  accessToken: string,
): Promise<SpreadsheetInfo | null> {
  try {
    const url = `${DRIVE_API}/files?q=name%3D%27ExerLog%20Data%27%20and%20mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27%20and%20trashed%3Dfalse&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id%2Cname)`;
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
): Promise<SpreadsheetInfo | null> {
  try {
    const body = {
      properties: { title: "ExerLog Data" },
      sheets: SHEET_TABS.map((title) => ({ properties: { title } })),
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
    const missingTabs = SHEET_TABS.filter((t) => !existingTabs.has(t));
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
 * Replace the whole content of a sheet tab: clear A:ZZ, then write `rows`
 * (header row included) starting at A1. RAW keeps every value a plain string.
 */
export async function replaceAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
): Promise<boolean> {
  try {
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
