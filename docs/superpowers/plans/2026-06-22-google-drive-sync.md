# Google Drive Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Sign-In + Google Sheets sync to ExerLog. On login, all IndexedDB data is synced to a single Google Spreadsheet (6 tabs). One-directional (IndexedDB → Sheets). Google Drive is the aggregate view.

**Architecture:** Google Identity Services (GIS) for OAuth 2.0, direct REST calls to Google Sheets API v4 and Drive API v3 (no client library). A React context provides auth/sync state across the app. Sync engine iterates 6 IndexedDB tables, compares keys against sheet data, and appends missing rows.

**Tech Stack:** Google Identity Services (GIS), Google Sheets API v4, Google Drive API v3, Dexie.js, React Context

---

### Task 1: Add `googleAuth` table to AppDb

**Files:**
- Modify: `src/features/storage/app-db.ts`
- Test: `src/features/storage/storage.test.ts`

- [ ] **Step 1: Add Dexie version 5 with googleAuth table**

Edit `src/features/storage/app-db.ts`:

1. Add `googleAuth` property type to the `AppDb` class:

```typescript
export class AppDb extends Dexie {
  logs!: EntityTable<ExerciseLog, "id">;
  conditions!: EntityTable<DailyConditionEntry, "date">;
  exercises!: EntityTable<ExerciseVideo, "id">;
  dailyWellness!: EntityTable<DailyWellnessEntry, "date">;
  dailyMetrics!: EntityTable<DailyMetricEntry, "id">;
  selfCareCatalog!: EntityTable<SelfCareItem, "id">;
  dailySelfCareLogs!: EntityTable<DailySelfCareEntry, "id">;
  googleAuth!: EntityTable<{ key: string; value: string }, "key">;  // new
}
```

2. Add version 5 after version 4's `.upgrade()`:

```typescript
this.version(5).stores({
  logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
  conditions: "date, conditionLevel, note, updatedAt",
  exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
  dailyWellness: "date, physicalScore, mentalScore, updatedAt",
  dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
  selfCareCatalog: "id, sortOrder, isArchived",
  dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
  googleAuth: "key",
});
```

- [ ] **Step 2: Write test for googleAuth table**

Add to `src/features/storage/storage.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from "vitest";
import { appDb } from "./app-db";

describe("googleAuth table", () => {
  beforeEach(async () => {
    await appDb.googleAuth.clear();
  });

  test("stores and retrieves key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "test_key", value: "test_value" });
    const result = await appDb.googleAuth.get("test_key");
    expect(result?.value).toBe("test_value");
  });

  test("deletes key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "to_delete", value: "data" });
    await appDb.googleAuth.delete("to_delete");
    const result = await appDb.googleAuth.get("to_delete");
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/features/storage/storage.test.ts -t "googleAuth" -v`
Expected: 2 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/storage/app-db.ts src/features/storage/storage.test.ts
git commit -m "feat(db): add googleAuth table for token storage"
```

---

### Task 2: Create google-auth.ts (GIS auth module)

**Files:**
- Create: `src/features/sync/google-auth.ts`
- Test: `src/features/sync/google-auth.test.ts`

This module handles Google Identity Services: loading the GIS script, sign-in popup, token storage in Dexie, and sign-out.

- [ ] **Step 1: Write the test**

Create `src/features/sync/google-auth.test.ts`:

```typescript
import { describe, expect, test, vi, beforeEach } from "vitest";
import { appDb } from "@/features/storage/app-db";
import {
  GOOGLE_CLIENT_ID,
  loadStoredToken,
  storeToken,
  clearToken,
  parseTokenFromResponse,
} from "./google-auth";

beforeEach(async () => {
  await appDb.googleAuth.clear();
});

describe("storeToken / loadStoredToken", () => {
  test("stores and loads token from Dexie", async () => {
    const token = { accessToken: "abc", expiresAt: Date.now() + 3600000, email: "test@example.com" };
    await storeToken(token);
    const loaded = await loadStoredToken();
    expect(loaded).not.toBeNull();
    expect(loaded!.email).toBe("test@example.com");
    expect(loaded!.accessToken).toBe("abc");
  });

  test("returns null when no token stored", async () => {
    const loaded = await loadStoredToken();
    expect(loaded).toBeNull();
  });

  test("clearToken removes stored token", async () => {
    await storeToken({ accessToken: "abc", expiresAt: Date.now() + 3600000, email: "t@t.com" });
    await clearToken();
    const loaded = await loadStoredToken();
    expect(loaded).toBeNull();
  });
});

describe("parseTokenFromResponse", () => {
  test("parses a valid GIS token response", () => {
    const response = {
      access_token: "xyz789",
      expires_in: 3600,
    };
    const now = Date.now();
    const result = parseTokenFromResponse(response, "user@example.com");
    expect(result.accessToken).toBe("xyz789");
    expect(result.email).toBe("user@example.com");
    // expiresAt should be roughly now + expires_in * 1000
    expect(result.expiresAt).toBeGreaterThan(now + 3500000);
    expect(result.expiresAt).toBeLessThan(now + 3700000);
  });
});
```

- [ ] **Step 2: Implement google-auth.ts**

Create `src/features/sync/google-auth.ts`:

```typescript
import { appDb } from "@/features/storage/app-db";

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
  email: string;
}

const TOKEN_KEY = "google_oauth_token";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export function parseTokenFromResponse(
  response: google.accounts.oauth2.TokenResponse,
  email: string,
): GoogleToken {
  return {
    accessToken: response.access_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    email,
  };
}

export async function storeToken(token: GoogleToken): Promise<void> {
  await appDb.googleAuth.put({ key: TOKEN_KEY, value: JSON.stringify(token) });
}

export async function loadStoredToken(): Promise<GoogleToken | null> {
  const entry = await appDb.googleAuth.get(TOKEN_KEY);
  if (!entry) return null;
  try {
    return JSON.parse(entry.value) as GoogleToken;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  await appDb.googleAuth.delete(TOKEN_KEY);
}

/** Dynamically load the GIS script. Returns a promise that resolves when loaded. */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(script);
  });
}

/** Initialize the token client (loads GIS if needed). Must be called from user gesture context. */
export async function initTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;
  await loadGisScript();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // Callback is set per-request via requestAccessToken
  });
  return tokenClient;
}

/** Open sign-in popup. Returns the token on success. */
export async function requestSignIn(): Promise<GoogleToken> {
  const client = await initTokenClient();
  const token = await new Promise<GoogleToken>((resolve, reject) => {
    client.callback = async (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      // Get the hint from the token response where available
      const hint = (response as any).hint ?? "";
      const parsed = parseTokenFromResponse(response, hint || "unknown");
      await storeToken(parsed);
      resolve(parsed);
    };
    client.requestAccessToken();
  });
  tokenClient = null; // Reset so next sign-in gets fresh client
  return token;
}

/** Sign out: clear stored token. GIS doesn't revoke tokens via client-side, just remove our copy. */
export async function signOut(): Promise<void> {
  await clearToken();
  tokenClient = null;
}

/** Attempt silent token refresh if we have a stored token. Returns token or null. */
export async function trySilentRefresh(): Promise<GoogleToken | null> {
  const stored = await loadStoredToken();
  if (!stored) return null;

  // If token is still valid (>5 min remaining), use it as-is
  if (stored.expiresAt > Date.now() + 300000) {
    return stored;
  }

  // Try silent refresh via GIS
  try {
    const client = await initTokenClient();
    const refreshed = await new Promise<GoogleToken>((resolve, reject) => {
      client.callback = async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const parsed = parseTokenFromResponse(response, stored.email);
        await storeToken(parsed);
        resolve(parsed);
      };
      client.requestAccessToken({ hint: stored.email });
    });
    return refreshed;
  } catch {
    await clearToken();
    return null;
  }
}

/** Check if a stored token exists and is not expired (within 5-minute buffer). */
export async function hasValidToken(): Promise<boolean> {
  const token = await loadStoredToken();
  return token !== null && token.expiresAt > Date.now() + 60000;
}
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/features/sync/google-auth.test.ts -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/sync/google-auth.ts src/features/sync/google-auth.test.ts
git commit -m "feat(sync): add google-auth module with GIS token management"
```

---

### Task 3: Create google-sheets.ts (Sheets API operations)

**Files:**
- Create: `src/features/sync/google-sheets.ts`
- Test: `src/features/sync/google-sheets.test.ts`

This module wraps Google Sheets API v4 and Drive API v3 calls. Uses direct `fetch()` (no client library).

- [ ] **Step 1: Write the test**

Create `src/features/sync/google-sheets.test.ts`:

```typescript
import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  findSpreadsheet,
  createSpreadsheet,
  readSheetColumn,
  appendRows,
  ensureSheetTabs,
} from "./google-sheets";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;
const FAKE_TOKEN = "fake-token";

beforeEach(() => {
  mockFetch.mockReset();
});

describe("findSpreadsheet", () => {
  test("returns spreadsheet info when found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [{ id: "sheet123", name: "ExerLog Data" }],
        }),
    });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toEqual({ spreadsheetId: "sheet123" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ExerLog%20Data"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer fake-token" }) }),
    );
  });

  test("returns null when no spreadsheet found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toBeNull();
  });

  test("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toBeNull();
  });
});

describe("createSpreadsheet", () => {
  test("creates spreadsheet with all tabs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          spreadsheetId: "new123",
          spreadsheetUrl: "https://sheets.google.com/spreadsheets/d/new123",
        }),
    });
    const result = await createSpreadsheet(FAKE_TOKEN);
    expect(result).not.toBeNull();
    expect(result!.spreadsheetId).toBe("new123");
    // Check that the body includes all 6 sheet titles
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.sheets).toHaveLength(6);
    expect(callBody.sheets.map((s: any) => s.properties.title)).toEqual([
      "ExerciseLogs",
      "DailyWellness",
      "DailyMetrics",
      "DailySelfCare",
      "Exercises",
      "SelfCareCatalog",
    ]);
  });
});

describe("readSheetColumn", () => {
  test("returns values from the first column", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          values: [["id"], ["a"], ["b"], ["c"]],
        }),
    });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "ExerciseLogs");
    // Header row is excluded
    expect(result).toEqual(["a", "b", "c"]);
  });

  test("returns empty array when sheet is empty or missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "EmptySheet");
    expect(result).toEqual([]);
  });

  test("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "Fail");
    expect(result).toEqual([]);
  });
});

describe("appendRows", () => {
  test("sends values to the sheets append endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    const headers = ["id", "date"];
    const rows = [
      ["1", "2026-01-01"],
      ["2", "2026-01-02"],
    ];
    await appendRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", headers, rows);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.values).toEqual([["1", "2026-01-01"], ["2", "2026-01-02"]]);
  });

  test("skips API call when rows are empty", async () => {
    mockFetch.mockReset();
    await appendRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", ["id"], []);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("ensureSheetTabs", () => {
  test("creates missing sheet tabs", async () => {
    // First call to get spreadsheet metadata returns only 2 existing sheets
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [
            { properties: { title: "ExerciseLogs" } },
            { properties: { title: "DailyWellness" } },
          ],
        }),
    });
    // Second call is batchUpdate to add missing tabs
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ replies: [{}] }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123");
    expect(result).toBe(true);
    const batchBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(batchBody.requests).toHaveLength(4); // 4 missing tabs
  });

  test("succeeds when all tabs exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [
            { properties: { title: "ExerciseLogs" } },
            { properties: { title: "DailyWellness" } },
            { properties: { title: "DailyMetrics" } },
            { properties: { title: "DailySelfCare" } },
            { properties: { title: "Exercises" } },
            { properties: { title: "SelfCareCatalog" } },
          ],
        }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No batchUpdate call
  });
});
```

- [ ] **Step 2: Implement google-sheets.ts**

Create `src/features/sync/google-sheets.ts`:

```typescript
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
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/features/sync/google-sheets.test.ts -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/sync/google-sheets.ts src/features/sync/google-sheets.test.ts
git commit -m "feat(sync): add google-sheets module with Sheets API operations"
```

---

### Task 4: Create sync-engine.ts (sync orchestration)

**Files:**
- Create: `src/features/sync/sync-engine.ts`
- Create: `src/features/sync/sync-config.ts`
- Test: `src/features/sync/sync-engine.test.ts`

The sync engine orchestrates syncing each of the 6 IndexedDB tables to the spreadsheet. It calls the sheets module for I/O and the repo modules for IndexedDB reads.

- [ ] **Step 1: Create sync-config.ts**

Create `src/features/sync/sync-config.ts`:

```typescript
/** Map of sheet tab name → { keyColumn, headers, readFromDb } */
export interface TableSyncConfig {
  keyColumn: string;
  headers: string[];
  readFromDb: () => Promise<any[]>;
  toRow: (record: any) => string[];
}

import { appDb } from "@/features/storage/app-db";

export const TABLE_SYNC_CONFIGS: TableSyncConfig[] = [
  {
    // ExerciseLogs
    keyColumn: "id",
    headers: ["id", "date", "exerciseId", "result", "loggedAt"],
    readFromDb: () => appDb.logs.toArray(),
    toRow: (r) => [r.id, r.date, r.exerciseId, r.result, r.loggedAt],
  },
  {
    // DailyWellness
    keyColumn: "date",
    headers: ["date", "physicalScore", "mentalScore", "note", "updatedAt"],
    readFromDb: () => appDb.dailyWellness.toArray(),
    toRow: (r) => [
      r.date,
      String(r.physicalScore),
      String(r.mentalScore),
      r.note ?? "",
      r.updatedAt,
    ],
  },
  {
    // DailyMetrics
    keyColumn: "id",
    headers: ["id", "date", "metricType", "value", "unit", "recordedAt"],
    readFromDb: () => appDb.dailyMetrics.toArray(),
    toRow: (r) => [
      r.id,
      r.date,
      r.metricType,
      String(r.value),
      r.unit,
      r.recordedAt,
    ],
  },
  {
    // DailySelfCare
    keyColumn: "id",
    headers: [
      "id",
      "date",
      "selfCareId",
      "isDone",
      "count",
      "minutes",
      "note",
      "recordedAt",
    ],
    readFromDb: () => appDb.dailySelfCareLogs.toArray(),
    toRow: (r) => [
      r.id,
      r.date,
      r.selfCareId,
      r.isDone ? "TRUE" : "FALSE",
      r.count != null ? String(r.count) : "",
      r.minutes != null ? String(r.minutes) : "",
      r.note ?? "",
      r.recordedAt,
    ],
  },
  {
    // Exercises (master)
    keyColumn: "id",
    headers: [
      "id",
      "title",
      "description",
      "videoUrl",
      "thumbnailUrl",
      "bodyArea",
      "purpose",
      "durationMinutes",
      "intensity",
    ],
    readFromDb: () => appDb.exercises.toArray(),
    toRow: (r) => [
      r.id,
      r.title,
      r.description ?? "",
      r.videoUrl,
      r.thumbnailUrl ?? "",
      r.bodyArea,
      r.purpose,
      String(r.durationMinutes),
      r.intensity,
    ],
  },
  {
    // SelfCareCatalog (master)
    keyColumn: "id",
    headers: ["id", "title", "description", "sortOrder", "isArchived"],
    readFromDb: () => appDb.selfCareCatalog.toArray(),
    toRow: (r) => [
      r.id,
      r.title,
      r.description ?? "",
      String(r.sortOrder),
      r.isArchived ? "TRUE" : "FALSE",
    ],
  },
];
```

- [ ] **Step 2: Write sync-engine test**

Create `src/features/sync/sync-engine.test.ts`:

```typescript
import { describe, expect, test, vi, beforeEach } from "vitest";
import { syncTable, syncAll } from "./sync-engine";

// Mock the sheets module
vi.mock("./google-sheets", () => ({
  readSheetColumn: vi.fn(),
  appendRowsBatched: vi.fn(),
}));

import { readSheetColumn, appendRowsBatched } from "./google-sheets";

const FAKE_TOKEN = "fake-token";
const FAKE_SPREADSHEET_ID = "sheet123";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncTable", () => {
  const config = {
    keyColumn: "id",
    headers: ["id", "name"],
    // eslint-disable-next-line @typescript-eslint/require-await
    readFromDb: async () => [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ],
    toRow: (r: any) => [r.id, r.name],
  };

  test("appends only new rows not present in sheet", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue(["1", "3"]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(1);
    expect(result.total).toBe(3);
    expect(result.found).toBe(2);
    expect(appendRowsBatched).toHaveBeenCalledWith(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config.headers,
      [["2", "Bob"]],
    );
  });

  test("appends all rows when sheet is empty", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(3);
  });

  test("appends nothing when all rows exist", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue(["1", "2", "3"]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(0);
    expect(appendRowsBatched).not.toHaveBeenCalled();
  });

  test("reports error when append fails", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(false);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.error).toBeDefined();
    expect(result.appended).toBe(0);
  });
});
```

- [ ] **Step 3: Implement sync-engine.ts**

Create `src/features/sync/sync-engine.ts`:

```typescript
import { findSpreadsheet, createSpreadsheet, readSheetColumn, appendRowsBatched, ensureSheetTabs, writeHeaders } from "./google-sheets";
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
      return {
        success: false,
        results: [{ tableName: "spreadsheet", total: 0, found: 0, appended: 0, error: "Failed to create spreadsheet" }],
      };
    }
    // Write headers for all tabs on first creation
    for (const config of TABLE_SYNC_CONFIGS) {
      const tabName = TABLE_SYNC_CONFIGS.indexOf(config) === 0
        ? TABLE_SYNC_CONFIGS[0].headers[0]
        : "";
      const sheetName = ["ExerciseLogs", "DailyWellness", "DailyMetrics", "DailySelfCare", "Exercises", "SelfCareCatalog"][TABLE_SYNC_CONFIGS.indexOf(config)];
      await writeHeaders(accessToken, info.spreadsheetId, sheetName, config.headers);
    }
  } else {
    // Ensure all tabs exist for existing spreadsheet
    await ensureSheetTabs(accessToken, info.spreadsheetId);
  }

  // Step 2: Sync each table sequentially
  for (let i = 0; i < TABLE_SYNC_CONFIGS.length; i++) {
    const config = TABLE_SYNC_CONFIGS[i];
    const sheetName = ["ExerciseLogs", "DailyWellness", "DailyMetrics", "DailySelfCare", "Exercises", "SelfCareCatalog"][i];
    const result = await syncTable(accessToken, info.spreadsheetId, sheetName, config, cb);
    results.push(result);
  }

  const hasError = results.some((r) => r.error);
  return {
    success: !hasError,
    results,
    spreadsheetId: info.spreadsheetId,
  };
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/features/sync/sync-engine.test.ts -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/sync-engine.ts src/features/sync/sync-config.ts src/features/sync/sync-engine.test.ts
git commit -m "feat(sync): add sync-engine and sync-config modules"
```

---

### Task 5: Create SyncProvider (React context)

**Files:**
- Create: `src/features/sync/SyncProvider.tsx`
- Test: `src/features/sync/SyncProvider.test.tsx`

- [ ] **Step 1: Write the test**

Create `src/features/sync/SyncProvider.test.tsx`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncProvider, useSync } from "./SyncProvider";

function TestConsumer() {
  const { status } = useSync();
  return <div data-testid="status">{status.type}</div>;
}

describe("SyncProvider", () => {
  test("provides disconnected status by default", () => {
    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("disconnected");
  });

  test("useSync throws outside provider", () => {
    // Suppress console.error for expected React error boundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Implement SyncProvider.tsx**

Create `src/features/sync/SyncProvider.tsx`:

```typescript
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { trySilentRefresh, requestSignIn, signOut, hasValidToken } from "./google-auth";
import { syncAll } from "./sync-engine";
import type { SyncAllResult, SyncTableResult } from "./sync-engine";

export type SyncStatus =
  | { type: "disconnected" }
  | { type: "syncing"; message: string; progress: number }
  | { type: "synced"; lastSynced: Date }
  | { type: "error"; message: string; partial: boolean };

interface SyncContextValue {
  status: SyncStatus;
  signIn: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<void>;
  userEmail: string | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({ type: "disconnected" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncNow = useCallback(async () => {
    setStatus({ type: "syncing", message: "Starting sync...", progress: 0 });

    const onProgress = (result: SyncTableResult) => {
      if (!mountedRef.current) return;
      setStatus({
        type: "syncing",
        message: `Synced ${result.tableName} (${result.appended} new rows)`,
        progress: 0, // Simplified; actual progress aggregated at completion
      });
    };

    // Get the current token from stored or silent refresh
    const token = await trySilentRefresh();
    if (!token) {
      setStatus({ type: "disconnected" });
      return;
    }

    const result: SyncAllResult = await syncAll(token.accessToken, onProgress);

    if (!mountedRef.current) return;

    const hasError = result.results?.some((r) => r.error);
    if (hasError) {
      const errorMessages = result.results
        .filter((r) => r.error)
        .map((r) => `${r.tableName}: ${r.error}`)
        .join("; ");
      setStatus({
        type: "error",
        message: errorMessages,
        partial: true,
      });
    } else {
      setStatus({ type: "synced", lastSynced: new Date() });
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      const token = await requestSignIn();
      setUserEmail(token.email);
      // Trigger sync after sign-in
      await syncNow();
    } catch {
      setStatus({ type: "disconnected" });
    }
  }, [syncNow]);

  const handleDisconnect = useCallback(async () => {
    await signOut();
    setUserEmail(null);
    setStatus({ type: "disconnected" });
  }, []);

  // On mount, try silent refresh and sync
  useEffect(() => {
    (async () => {
      const valid = await hasValidToken();
      if (!valid) return;
      const token = await trySilentRefresh();
      if (!token) return;
      setUserEmail(token.email);
      await syncNow();
    })();
  }, [syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      signIn: handleSignIn,
      disconnect: handleDisconnect,
      syncNow,
      userEmail,
    }),
    [status, handleSignIn, handleDisconnect, syncNow, userEmail],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
```

- [ ] **Step 3: Run test**

Run: `npx vitest run src/features/sync/SyncProvider.test.tsx -v`
Expected: Both tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/sync/SyncProvider.tsx src/features/sync/SyncProvider.test.tsx
git commit -m "feat(sync): add SyncProvider context for auth/sync state"
```

---

### Task 6: Create GoogleDriveSettings UI component

**Files:**
- Create: `src/features/settings/components/google-drive-settings.tsx`
- Test: `src/features/settings/components/google-drive-settings.test.tsx`

- [ ] **Step 1: Write the test**

Create `src/features/settings/components/google-drive-settings.test.tsx`:

```typescript
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncContext } from "@/features/sync/SyncProvider";
import { GoogleDriveSettings } from "./google-drive-settings";

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    status: { type: "disconnected" as const },
    signIn: vi.fn(),
    disconnect: vi.fn(),
    syncNow: vi.fn(),
    userEmail: null,
    ...overrides,
  };
}

describe("GoogleDriveSettings", () => {
  test("shows sign-in button when disconnected", () => {
    const ctx = createMockContext();
    render(
      <SyncContext.Provider value={ctx as any}>
        <GoogleDriveSettings />
      </SyncContext.Provider>,
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  test("calls signIn when button clicked", async () => {
    const ctx = createMockContext();
    const user = userEvent.setup();
    render(
      <SyncContext.Provider value={ctx as any}>
        <GoogleDriveSettings />
      </SyncContext.Provider>,
    );
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(ctx.signIn).toHaveBeenCalledOnce();
  });

  test("shows connected state with email", () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date("2026-06-22T10:00:00") },
      userEmail: "user@gmail.com",
    });
    render(
      <SyncContext.Provider value={ctx as any}>
        <GoogleDriveSettings />
      </SyncContext.Provider>,
    );
    expect(screen.getByText("user@gmail.com")).toBeDefined();
    expect(screen.getByText(/sync now/i)).toBeDefined();
    expect(screen.getByText(/disconnect/i)).toBeDefined();
  });

  test("shows syncing state", () => {
    const ctx = createMockContext({
      status: { type: "syncing", message: "Syncing ExerciseLogs...", progress: 0 },
    });
    render(
      <SyncContext.Provider value={ctx as any}>
        <GoogleDriveSettings />
      </SyncContext.Provider>,
    );
    expect(screen.getByText(/syncing/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Export SyncContext from SyncProvider**

Edit `src/features/sync/SyncProvider.tsx` to export `SyncContext`:

After the `useSync` function, add:
```typescript
export { SyncContext };
```

- [ ] **Step 3: Implement GoogleDriveSettings component**

Create `src/features/settings/components/google-drive-settings.tsx`:

```typescript
"use client";

import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";

export function GoogleDriveSettings() {
  const { status, signIn, disconnect, syncNow, userEmail } = useSync();
  const { t } = useTranslation();

  if (status.type === "disconnected") {
    return (
      <div className="data-management__group">
        <h3 className="data-management__group-heading">
          {t("settings_google_drive_heading")}
        </h3>
        <p className="data-management__status">
          {t("settings_google_drive_description")}
        </p>
        <div className="data-management__buttons">
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void signIn()}
          >
            {t("settings_google_drive_sign_in")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="data-management__group">
      <h3 className="data-management__group-heading">
        {t("settings_google_drive_heading")}
      </h3>

      {status.type === "syncing" && (
        <p className="data-management__status">
          {t("settings_google_drive_syncing")}
        </p>
      )}

      {status.type === "synced" && (
        <>
          <p className="data-management__status">
            ✅ {userEmail}
          </p>
          <p className="data-management__status">
            {t("settings_google_drive_last_synced")}:{" "}
            {status.lastSynced.toLocaleString()}
          </p>
        </>
      )}

      {status.type === "error" && (
        <p className="data-management__status">
          ❌ {status.message}
        </p>
      )}

      <div className="data-management__buttons">
        <button
          type="button"
          className="settings-action-button"
          onClick={() => void syncNow()}
          disabled={status.type === "syncing"}
        >
          {t("settings_google_drive_sync_now")}
        </button>
        <button
          type="button"
          className="settings-action-button settings-action-button--secondary"
          onClick={() => void disconnect()}
        >
          {t("settings_google_drive_disconnect")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/features/settings/components/google-drive-settings.test.tsx -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/components/google-drive-settings.tsx src/features/settings/components/google-drive-settings.test.tsx
git commit -m "feat(settings): add GoogleDriveSettings UI component"
```

---

### Task 7: Update settings screen and layout, add i18n keys

**Files:**
- Modify: `src/features/settings/components/settings-screen.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/features/i18n/messages/ja.ts`
- Modify: `src/features/i18n/messages/en.ts`

- [ ] **Step 1: Add i18n keys**

Add to `src/features/i18n/messages/ja.ts` (after `settings_delete_success_logs`):

```typescript
// Google Drive sync
settings_google_drive_heading: "Google Drive 連携",
settings_google_drive_description: "Googleアカウントでログインすると、データがGoogleスプレッドシートと自動的に同期されます。",
settings_google_drive_sign_in: "Googleでサインイン",
settings_google_drive_sync_now: "今すぐ同期",
settings_google_drive_disconnect: "切断",
settings_google_drive_syncing: "同期中...",
settings_google_drive_last_synced: "最終同期",
```

Add to `src/features/i18n/messages/en.ts` (after `settings_delete_success_logs`):

```typescript
// Google Drive sync
settings_google_drive_heading: "Google Drive Sync",
settings_google_drive_description: "Sign in with Google to automatically sync your data to a Google Spreadsheet.",
settings_google_drive_sign_in: "Sign in with Google",
settings_google_drive_sync_now: "Sync Now",
settings_google_drive_disconnect: "Disconnect",
settings_google_drive_syncing: "Syncing...",
settings_google_drive_last_synced: "Last synced",
```

- [ ] **Step 2: Add SyncProvider to layout.tsx**

Edit `src/app/layout.tsx`:

1. Add import: `import { SyncProvider } from "@/features/sync/SyncProvider";`
2. Wrap inside `DbInitProvider`:
```typescript
<LanguageProvider>
  <DbInitProvider>
    <SyncProvider>{children}</SyncProvider>
  </DbInitProvider>
</LanguageProvider>
```

- [ ] **Step 3: Add GoogleDrive section to SettingsScreen**

Edit `src/features/settings/components/settings-screen.tsx`:

1. Add import: `import { GoogleDriveSettings } from "./google-drive-settings";`
2. Add after the `DataManagement` section:
```typescript
<section className="card settings-section">
  <h2>Google Drive</h2>
  <GoogleDriveSettings />
</section>
```

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `npx vitest run -v`
Expected: All existing tests PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/components/settings-screen.tsx src/app/layout.tsx src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "feat(settings): add Google Drive section to settings, update layout and i18n"
```

---

### Task 8: Add .env.example and GCP setup docs

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
# Google OAuth Client ID (create at https://console.cloud.google.com/apis/credentials)
# Steps:
# 1. Go to Google Cloud Console → APIs & Services → Credentials
# 2. Create OAuth 2.0 Client ID (Web application type)
# 3. Add authorized JavaScript origins (e.g., http://localhost:3000, https://fuji3to4.github.io)
# 4. Enable Google Sheets API and Google Drive API
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example for Google OAuth client ID"
```

---

### Self-Review

**Spec coverage check:**
| Spec Section | Covered By |
|---|---|
| 2. Auth & Token Management (GIS) | Task 2 (google-auth.ts) |
| 2.6 Token Storage (googleAuth table) | Task 1 (app-db.ts v5) |
| 3. Spreadsheet Structure (6 tabs) | Task 3 (google-sheets.ts), Task 4 (sync-config.ts) |
| 3.3 Creation Flow (find/create spreadsheet) | Task 3 (findSpreadsheet/createSpreadsheet) |
| 4. Sync Algorithm (per-table logic) | Task 4 (sync-engine.ts) |
| 4.3 Dedup Keys | Task 4 (sync-config.ts keyColumn) |
| 4.4 Batch Efficiency | Task 3 (appendRowsBatched) |
| 4.5 Safety (per-table try/catch) | Task 4 (syncTable wraps in try/catch) |
| 5. UI Components | Task 5 (SyncProvider), Task 6 (GoogleDriveSettings) |
| 5.4 Provider Placement | Task 7 (layout.tsx) |
| 6. Error Handling | Task 4 (error reporting), Task 5 (status types) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Task 8 (.env.example) |

**Placeholder scan:** No TBD, TODO, or placeholders found.

**Type consistency:** All interfaces (GoogleToken, SyncStatus, SyncTableResult, SyncAllResult) are defined once and imported where needed. Method signatures (readSheetColumn, appendRowsBatched, syncTable, syncAll) are consistent across their definitions and call sites.
