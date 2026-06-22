const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export const SHEET_TABS = [
  "ExerciseLogs",
  "DailyWellness",
  "DailyMetrics",
  "DailySelfCare",
  "Exercises",
  "SelfCareCatalog",
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
    const url = `${DRIVE_API}/files?q=name%3D%27ExerLog%20Data%27%20and%20mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id%2Cname)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.files?.length) return null;
    return { spreadsheetId: data.files[0].id };
  } catch {
    return null;
  }
}

/** Create a new spreadsheet with all 6 sheet tabs. */
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
    if (!res.ok) return null;
    const data = await res.json();
    return { spreadsheetId: data.spreadsheetId };
  } catch {
    return null;
  }
}

/** Read values from the first column of a sheet tab (skipping header row). */
export async function readSheetColumn(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[]> {
  try {
    const range = encodeURIComponent(`${sheetName}!A:A`);
    const res = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.values?.length) return [];
    // Skip header row (index 0), return values
    return data.values.slice(1).map((row: string[]) => String(row[0] ?? ""));
  } catch {
    return [];
  }
}

/** Ensure all 6 sheet tabs exist. Creates missing ones via batchUpdate. */
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

/** Write header row to a sheet tab. Used after creating a new sheet. */
export async function writeHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<boolean> {
  try {
    const range = encodeURIComponent(`${sheetName}!A1`);
    const res = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [headers] }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Append rows to a sheet tab. Skips empty rows arrays. */
export async function appendRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<boolean> {
  if (rows.length === 0) return true;
  try {
    const range = encodeURIComponent(`${sheetName}!A1`);
    const res = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Batch append: split rows into batches of 10 to stay under API limits. */
export async function appendRowsBatched(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: string[][],
): Promise<boolean> {
  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const ok = await appendRows(accessToken, spreadsheetId, sheetName, headers, batch);
    if (!ok) return false;
  }
  return true;
}