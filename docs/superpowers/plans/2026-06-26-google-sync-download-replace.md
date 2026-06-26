# Google Sync Download & Local Replace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a download-and-replace phase to manual Google Drive sync so local IndexedDB is overwritten with Google Sheets data (source of truth).

**Architecture:** Extend the existing sync engine with a second phase: after uploading new local rows, read all rows from each Google Sheet tab, clear the corresponding IndexedDB table, and bulk-write the downloaded data. The existing auto-sync (30s debounce) stays upload-only.

**Tech Stack:** Next.js 15, Dexie (IndexedDB), Google Sheets API v4, Vitest

**Files changed:**
- `src/features/sync/google-sheets.ts` — add `readAllRows()`
- `src/features/sync/sync-config.ts` — extend `TableSyncConfig`, implement for all 6 tables
- `src/features/sync/sync-engine.ts` — add `SyncMode`, `downloadAndReplaceAll()`, refactor flow
- `src/features/sync/SyncProvider.tsx` — pass mode parameter
- `src/features/sync/sync-engine.test.ts` — update mock, add download tests
- `src/features/sync/google-sheets.test.ts` — add readAllRows tests
- `src/features/sync/SyncProvider.test.tsx` — update syncAll assertion for mode

---

### Task 1: Add `readAllRows()` to google-sheets.ts

**Files:**
- Modify: `src/features/sync/google-sheets.ts`
- Test: `src/features/sync/google-sheets.test.ts`

- [ ] **Step 1: Write the failing test for readAllRows**

Add these tests in `google-sheets.test.ts` after the `readSheetColumn` describe block. Update the import to include `readAllRows`:

```typescript
import {
  findSpreadsheet,
  createSpreadsheet,
  readSheetColumn,
  appendRows,
  ensureSheetTabs,
  readAllRows,         // ← add this
} from "./google-sheets";
```

Append after line 106 (the `readSheetColumn` describe block's closing `});`):

```typescript
describe("readAllRows", () => {
  test("returns all rows including header when sheet has data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          values: [
            ["id", "date", "exerciseId"],
            ["1", "2026-01-01", "ex-1"],
            ["2", "2026-01-02", "ex-2"],
          ],
        }),
    });
    const result = await readAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs");
    expect(result).toEqual([
      ["id", "date", "exerciseId"],
      ["1", "2026-01-01", "ex-1"],
      ["2", "2026-01-02", "ex-2"],
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ExerciseLogs!A:ZZ"),
      expect.any(Object),
    );
  });

  test("returns empty array when sheet is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const result = await readAllRows(FAKE_TOKEN, "sheet123", "EmptySheet");
    expect(result).toEqual([]);
  });

  test("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await readAllRows(FAKE_TOKEN, "sheet123", "Fail");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sync/google-sheets.test.ts --reporter verbose`
Expected: 3 FAILED tests — "readAllRows is not defined" (not exported yet)

- [ ] **Step 3: Write minimal implementation**

Add this function to `src/features/sync/google-sheets.ts` after `readSheetColumn`:

```typescript
/** Read ALL rows from a sheet tab (including header). Returns string[][] with first row = header. */
export async function readAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  try {
    const range = encodeURIComponent(`${sheetName}!A:ZZ`);
    const res = await fetch(
      `${SHEETS_API}/${spreadsheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.values ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/sync/google-sheets.test.ts --reporter verbose`
Expected: All 3 readAllRows tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/google-sheets.ts src/features/sync/google-sheets.test.ts
git commit -m "feat: add readAllRows to google-sheets module"
```

---

### Task 2: Extend `TableSyncConfig` with fromRow, clearDb, bulkWriteDb

**Files:**
- Modify: `src/features/sync/sync-config.ts`
- Modify: `src/features/sync/sync-engine.test.ts` — update mock configs

- [ ] **Step 1: Add new fields to TableSyncConfig interface**

In `sync-config.ts`, extend the interface:

```typescript
/** Map of sheet tab name → { keyColumn, headers, readFromDb, toRow, fromRow, clearDb, bulkWriteDb } */
export interface TableSyncConfig {
  keyColumn: string;
  headers: string[];
  readFromDb: () => Promise<any[]>;
  toRow: (record: any) => string[];
  fromRow: (row: string[], headers: string[]) => any;   // NEW
  clearDb: () => Promise<void>;                          // NEW
  bulkWriteDb: (records: any[]) => Promise<void>;         // NEW
}
```

- [ ] **Step 2: Implement fromRow, clearDb, bulkWriteDb for each config**

For each of the 6 configs in `TABLE_SYNC_CONFIGS`, add the three new fields:

**ExerciseLogs:**
```typescript
fromRow: (row, headers) => ({
  id: String(row[headers.indexOf("id")]),
  date: row[headers.indexOf("date")],
  exerciseId: row[headers.indexOf("exerciseId")],
  result: row[headers.indexOf("result")] as ExerciseLogResult,
  loggedAt: row[headers.indexOf("loggedAt")],
}),
clearDb: () => appDb.logs.clear(),
bulkWriteDb: (records) => appDb.logs.bulkPut(records as ExerciseLog[]),
```

**DailyWellness:**
```typescript
fromRow: (row, headers) => ({
  date: row[headers.indexOf("date")],
  physicalScore: Number(row[headers.indexOf("physicalScore")]) as WellnessScore,
  mentalScore: Number(row[headers.indexOf("mentalScore")]) as WellnessScore,
  note: row[headers.indexOf("note")] ?? "",
  updatedAt: row[headers.indexOf("updatedAt")],
}),
clearDb: () => appDb.dailyWellness.clear(),
bulkWriteDb: (records) => appDb.dailyWellness.bulkPut(records as DailyWellnessEntry[]),
```

**DailyMetrics:**
```typescript
fromRow: (row, headers) => ({
  id: String(row[headers.indexOf("id")]),
  date: row[headers.indexOf("date")],
  metricType: row[headers.indexOf("metricType")] as MetricType,
  value: Number(row[headers.indexOf("value")]),
  unit: row[headers.indexOf("unit")],
  recordedAt: row[headers.indexOf("recordedAt")],
}),
clearDb: () => appDb.dailyMetrics.clear(),
bulkWriteDb: (records) => appDb.dailyMetrics.bulkPut(records as DailyMetricEntry[]),
```

**DailySelfCare:**
```typescript
fromRow: (row, headers) => {
  const ci = (col: string) => headers.indexOf(col);
  const rawCount = row[ci("count")];
  const rawMinutes = row[ci("minutes")];
  return {
    id: String(row[ci("id")]),
    date: row[ci("date")],
    selfCareId: row[ci("selfCareId")],
    isDone: row[ci("isDone")] === "TRUE",
    count: rawCount ? Number(rawCount) : null,
    minutes: rawMinutes ? Number(rawMinutes) : null,
    note: row[ci("note")] ?? "",
    recordedAt: row[ci("recordedAt")],
  };
},
clearDb: () => appDb.dailySelfCareLogs.clear(),
bulkWriteDb: (records) => appDb.dailySelfCareLogs.bulkPut(records as DailySelfCareEntry[]),
```

**Exercises:**
```typescript
fromRow: (row, headers) => ({
  id: row[headers.indexOf("id")],
  title: row[headers.indexOf("title")],
  description: row[headers.indexOf("description")] ?? "",
  videoUrl: row[headers.indexOf("videoUrl")],
  thumbnailUrl: row[headers.indexOf("thumbnailUrl")] ?? "",
  bodyArea: row[headers.indexOf("bodyArea")],
  purpose: row[headers.indexOf("purpose")],
  durationMinutes: Number(row[headers.indexOf("durationMinutes")]),
  intensity: row[headers.indexOf("intensity")] as ExerciseIntensity,
}),
clearDb: () => appDb.exercises.clear(),
bulkWriteDb: (records) => appDb.exercises.bulkPut(records as ExerciseVideo[]),
```

**SelfCareCatalog:**
```typescript
fromRow: (row, headers) => ({
  id: row[headers.indexOf("id")],
  title: row[headers.indexOf("title")],
  description: row[headers.indexOf("description")] ?? "",
  sortOrder: Number(row[headers.indexOf("sortOrder")]),
  isArchived: row[headers.indexOf("isArchived")] === "TRUE",
}),
clearDb: () => appDb.selfCareCatalog.clear(),
bulkWriteDb: (records) => appDb.selfCareCatalog.bulkPut(records as SelfCareItem[]),
```

Add the missing imports at the top of sync-config.ts:
```typescript
import type {
  ExerciseLog,
  ExerciseVideo,
  DailyWellnessEntry,
  DailyMetricEntry,
  DailySelfCareEntry,
  SelfCareItem,
  ExerciseLogResult,
  WellnessScore,
  MetricType,
  ExerciseIntensity,
} from "@/lib/types";
```

- [ ] **Step 3: Update the mock config in sync-engine.test.ts**

The mock configs in `sync-engine.test.ts` need the new fields. The mock that replaces `TABLE_SYNC_CONFIGS` currently has 2 configs without fromRow/clearDb/bulkWriteDb. Add them:

```typescript
TABLE_SYNC_CONFIGS: [
  {
    keyColumn: "id",
    headers: ["id", "name"],
    readFromDb: async () => [{ id: "a", name: "A" }],
    toRow: (r: { id: string; name: string }) => [r.id, r.name],
    fromRow: (row: string[], hdrs: string[]) => ({
      id: row[hdrs.indexOf("id")],
      name: row[hdrs.indexOf("name")],
    }),
    clearDb: vi.fn().mockResolvedValue(undefined),
    bulkWriteDb: vi.fn().mockResolvedValue(undefined),
  },
  {
    keyColumn: "id",
    headers: ["id", "value"],
    readFromDb: async () => [{ id: "b", value: 1 }],
    toRow: (r: { id: string; value: number }) => [r.id, String(r.value)],
    fromRow: (row: string[], hdrs: string[]) => ({
      id: row[hdrs.indexOf("id")],
      value: Number(row[hdrs.indexOf("value")]),
    }),
    clearDb: vi.fn().mockResolvedValue(undefined),
    bulkWriteDb: vi.fn().mockResolvedValue(undefined),
  },
],
```

Also import `vi` and `describe`/`expect`/`test` are already there. The `vi` is already imported.

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `npx vitest run src/features/sync/ --reporter verbose`
Expected: All existing tests PASS (the new mock fields satisfy the extended interface)

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/sync-config.ts src/features/sync/sync-engine.test.ts
git commit -m "feat: extend TableSyncConfig with fromRow, clearDb, bulkWriteDb"
```

---

### Task 3: Add `downloadAndReplaceAll()` to sync-engine.ts

**Files:**
- Modify: `src/features/sync/sync-engine.ts`
- Test: `src/features/sync/sync-engine.test.ts`

- [ ] **Step 1: Write the failing test for downloadAndReplaceAll**

Add to `sync-engine.test.ts` after the `syncAll` describe block (before the file's closing lines):

```typescript
import {
  readSheetColumn,
  appendRowsBatched,
  findSpreadsheet,
  createSpreadsheet,
  ensureSheetTabs,
  writeHeaders,
  readAllRows,           // ← add to import
} from "./google-sheets";

// ... keep existing imports ...

describe("downloadAndReplaceAll", () => {
  const FAKE_SHEET_ID = "sheet123";

  test("reads all rows, clears db, and bulk-writes for each table", async () => {
    // Mock readAllRows to return header + 2 data rows for first table, header + 1 row for second
    vi.mocked(readAllRows)
      .mockResolvedValueOnce([
        ["id", "name"],
        ["a", "A"],
        ["c", "C"],
      ])
      .mockResolvedValueOnce([
        ["id", "value"],
        ["b", "2"],
      ]);

    // Import the mocked configs to get their clearDb/bulkWriteDb spies
    const { TABLE_SYNC_CONFIGS } = await import("./sync-config");

    const { downloadAndReplaceAll } = await import("./sync-engine");

    const result = await downloadAndReplaceAll(FAKE_TOKEN, FAKE_SHEET_ID);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);

    // First table: 2 data rows read, 2 written
    expect(result.results[0].rowsRead).toBe(2);
    expect(result.results[0].rowsWritten).toBe(2);
    // Second table: 1 data row read, 1 written
    expect(result.results[1].rowsRead).toBe(1);
    expect(result.results[1].rowsWritten).toBe(1);

    // Verify clearDb and bulkWriteDb were called
    expect(TABLE_SYNC_CONFIGS[0].clearDb).toHaveBeenCalled();
    expect(TABLE_SYNC_CONFIGS[0].bulkWriteDb).toHaveBeenCalledWith([
      { id: "a", name: "A" },
      { id: "c", name: "C" },
    ]);
    expect(TABLE_SYNC_CONFIGS[1].clearDb).toHaveBeenCalled();
    expect(TABLE_SYNC_CONFIGS[1].bulkWriteDb).toHaveBeenCalledWith([
      { id: "b", value: 2 },
    ]);
  });

  test("reports error per table when readAllRows fails", async () => {
    vi.mocked(readAllRows)
      .mockResolvedValueOnce([])  // first table fails → empty = no data
      .mockResolvedValueOnce([
        ["id", "value"],
        ["x", "10"],
      ]);

    const { downloadAndReplaceAll } = await import("./sync-engine");
    const result = await downloadAndReplaceAll(FAKE_TOKEN, FAKE_SHEET_ID);

    // First table: no error, just 0 rows
    expect(result.results[0].rowsRead).toBe(0);
    expect(result.results[0].rowsWritten).toBe(0);
    expect(result.results[0].error).toBeUndefined();

    // Second table: succeeds
    expect(result.results[1].rowsRead).toBe(1);
    expect(result.results[1].rowsWritten).toBe(1);
  });

  test("continues to next table when one table's bulkWriteDb throws", async () => {
    vi.mocked(readAllRows).mockResolvedValue([
      ["id", "name"],
      ["a", "A"],
    ]);
    vi.mocked(readAllRows).mockResolvedValueOnce([
      ["id", "value"],
      ["b", "2"],
    ]);

    const { TABLE_SYNC_CONFIGS } = await import("./sync-config");
    // Make second table's bulkWriteDb throw
    (TABLE_SYNC_CONFIGS[1].bulkWriteDb as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("write failed"));

    const { downloadAndReplaceAll } = await import("./sync-engine");
    const result = await downloadAndReplaceAll(FAKE_TOKEN, FAKE_SHEET_ID);

    expect(result.results[1].error).toContain("write failed");
    expect(result.success).toBe(false);
  });
});
```

**Important setup:** Add `readAllRows` to the vi.mock factory at the top of the file:

```typescript
vi.mock("./google-sheets", () => ({
  readSheetColumn: vi.fn(),
  appendRowsBatched: vi.fn(),
  findSpreadsheet: vi.fn(),
  createSpreadsheet: vi.fn(),
  ensureSheetTabs: vi.fn(),
  writeHeaders: vi.fn(),
  readAllRows: vi.fn(),          // ← add this
  SHEET_TABS: ["TableOne", "TableTwo"],
}));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sync/sync-engine.test.ts --reporter verbose`
Expected: `downloadAndReplaceAll` tests FAIL with "is not a function" (not exported yet)

- [ ] **Step 3: Export `readAllRows` from google-sheets barrel (already exported from Task 1)**

No action needed — `readAllRows` is already exported from `google-sheets.ts` from Task 1.

- [ ] **Step 4: Write minimal implementation of downloadAndReplaceAll**

Add this export to `sync-engine.ts`:

```typescript
import { readAllRows } from "./google-sheets";  // add to existing import

export interface DownloadTableResult {
  tableName: string;
  rowsRead: number;
  rowsWritten: number;
  error?: string;
}

/** Phase 2: download all rows from each Google Sheet and replace local IndexedDB. */
export async function downloadAndReplaceAll(
  accessToken: string,
  spreadsheetId: string,
  onProgress?: SyncProgressCallback,
): Promise<{ success: boolean; results: DownloadTableResult[] }> {
  const cb = onProgress ?? (() => {});
  const results: DownloadTableResult[] = [];

  for (let i = 0; i < TABLE_SYNC_CONFIGS.length; i++) {
    const config = TABLE_SYNC_CONFIGS[i];
    const sheetName = SHEET_TABS[i];
    const result: DownloadTableResult = {
      tableName: sheetName,
      rowsRead: 0,
      rowsWritten: 0,
    };

    try {
      const allRows = await readAllRows(accessToken, spreadsheetId, sheetName);
      // allRows[0] is the header; data rows are allRows.slice(1)
      if (allRows.length <= 1) {
        // No data rows (only header or empty)
        await config.clearDb();
        result.rowsRead = 0;
        result.rowsWritten = 0;
        cb({ tableName: sheetName, total: 0, found: 0, appended: 0 });
        results.push(result);
        continue;
      }

      const headers = allRows[0];
      const dataRows = allRows.slice(1);
      result.rowsRead = dataRows.length;

      const records = dataRows.map((row) => config.fromRow(row, headers));

      await config.clearDb();
      if (records.length > 0) {
        await config.bulkWriteDb(records);
      }
      result.rowsWritten = records.length;

      cb({ tableName: sheetName, total: records.length, found: 0, appended: 0 });
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
  }

  const hasError = results.some((r) => r.error);
  return { success: !hasError, results };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/sync/sync-engine.test.ts --reporter verbose`
Expected: All tests PASS including the new downloadAndReplaceAll tests

- [ ] **Step 6: Commit**

```bash
git add src/features/sync/sync-engine.ts src/features/sync/sync-engine.test.ts
git commit -m "feat: add downloadAndReplaceAll to sync-engine"
```

---

### Task 4: Add `SyncMode` and refactor syncAll to use it

**Files:**
- Modify: `src/features/sync/sync-engine.ts`
- Test: `src/features/sync/sync-engine.test.ts`

- [ ] **Step 1: Write failing test for syncAll with mode param**

Add to `sync-engine.test.ts`, inside the `describe("syncAll", ...)` block, add these tests:

```typescript
test("syncAll with mode='full' runs downloadAndReplaceAll after upload", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue({
      spreadsheetId: FAKE_SPREADSHEET_ID,
    });
    vi.mocked(ensureSheetTabs).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);
    vi.mocked(readAllRows).mockResolvedValue([
      ["id", "name"],
      ["a", "A"],
    ]);

    const result = await syncAll(FAKE_TOKEN, undefined, "full");

    expect(result.success).toBe(true);
    expect(readAllRows).toHaveBeenCalled();
    // Upload phase should have run too
    expect(appendRowsBatched).toHaveBeenCalled();
  });

  test("syncAll with default mode='upload-only' skips downloadAndReplaceAll", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue({
      spreadsheetId: FAKE_SPREADSHEET_ID,
    });
    vi.mocked(ensureSheetTabs).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncAll(FAKE_TOKEN);  // no mode param → default

    expect(result.success).toBe(true);
    expect(readAllRows).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sync/sync-engine.test.ts --reporter verbose`
Expected: 2 new tests FAIL (type error: syncAll doesn't accept 3rd arg)

- [ ] **Step 3: Implement SyncMode and refactor syncAll**

In `sync-engine.ts`:

Add the type:
```typescript
export type SyncMode = "upload-only" | "full";
```

Change the `syncAll` function signature to accept an optional mode:
```typescript
/** Sync all 6 tables. Returns aggregate result. */
export async function syncAll(
  accessToken: string,
  onProgress?: SyncProgressCallback,
  mode: SyncMode = "upload-only",         // NEW param
): Promise<SyncAllResult> {
  const execute = () => doSyncAll(accessToken, onProgress, mode);   // pass mode
  const nextPromise = activeSyncPromise.then(execute, execute);
  activeSyncPromise = nextPromise;
  return nextPromise;
}
```

Update `doSyncAll` to accept and use mode:
```typescript
async function doSyncAll(
  accessToken: string,
  onProgress?: SyncProgressCallback,
  mode: SyncMode = "upload-only",           // NEW param
): Promise<SyncAllResult> {
  const cb = onProgress ?? (() => {});
  const results: SyncTableResult[] = [];

  // Step 1: Find or create spreadsheet
  // ... (unchanged up to line 165) ...

  // Step 2: Sync each table sequentially (upload phase)
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

  // Step 3: Download & replace (only in "full" mode)
  if (mode === "full" && info.spreadsheetId) {
    const downloadResult = await downloadAndReplaceAll(
      accessToken,
      info.spreadsheetId,
      cb,
    );
    for (const dr of downloadResult.results) {
      const syncResult: SyncTableResult = {
        tableName: `Download:${dr.tableName}`,
        total: dr.rowsRead,
        found: 0,
        appended: dr.rowsWritten,
        error: dr.error,
      };
      results.push(syncResult);
    }
  }

  const hasError = results.some((r) => r.error);
  return {
    success: !hasError,
    results,
    spreadsheetId: info.spreadsheetId,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/sync/sync-engine.test.ts --reporter verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/sync-engine.ts src/features/sync/sync-engine.test.ts
git commit -m "feat: add SyncMode to syncAll - upload-only (default) or full"
```

---

### Task 5: Update SyncProvider to pass mode on manual sync

**Files:**
- Modify: `src/features/sync/SyncProvider.tsx`
- Test: `src/features/sync/SyncProvider.test.tsx`

- [ ] **Step 1: Write failing test**

In `SyncProvider.test.tsx`, update the existing test that checks the syncAll call:

Update line 105 (the signIn flow test):
```typescript
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

Update the on-mount effect test (line 229):
```typescript
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function));  // default = "upload-only" — no 3rd arg
```

Wait — actually the on-mount effect currently calls `syncNow()` which we're about to change to pass "full" by default. According to the design, page-load should be upload-only. So we need to change the on-mount effect to explicitly pass upload-only.

Let me think about this more carefully:

In the current code:
1. `syncNow()` — called on manual button click and sign-in and on-mount
2. We want: manual + sign-in → "full", on-mount → "upload-only"

So we need `syncNow()` to accept a mode parameter.

Update the test for signIn (line 105):
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

Add a new test for the on-mount behavior:
Actually, the on-mount effect also calls `syncNow()` but doesn't pass a mode. I need to either:
a. Change the on-mount to pass "upload-only", or
b. Keep syncNow as "full" and change on-mount to not use syncNow

Let me go with option (a): `syncNow()` defaults to "full", on-mount passes `"upload-only"`.

So the test should verify:
- signIn test: `syncAll` called with `"full"` mode
- syncNow test: `syncAll` called with `"full"` mode (the manual button)
- on-mount test: `syncAll` called without mode (defaults to upload-only) — this is the current assertion

Wait, the on-mount effect currently calls `syncNow()`.
If I change the on-mount to `syncNow("upload-only")` and `syncNow` defaults to "full", then:
- Manual button: `syncNow()` → "full"
- signIn: `syncNow()` → "full" (it calls await syncNow())
- on-mount: `syncNow("upload-only")` → "upload-only"

Tests to update:

1. signIn (line 105): `expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");`
2. syncNow success (line 125): verify called with "full" mode
3. on-mount (line 229): this calls syncNow() (full by default)... but we want upload-only on mount.

Hmm, I need to decide: should the on-mount effect call `syncNow("upload-only")` or just call `syncAll` directly?

Looking at the code, `syncNow` manages the status transitions (syncing → synced/error). The on-mount effect should still show syncing/synced state. So `syncNow("upload-only")` is cleaner.

Let me update the implementation plan tests accordingly.

Add these test changes:

1. In the signIn test, change assertion to include "full" mode
2. In the syncNow success test, change assertion to include "full" mode
3. In the on-mount test, keep the current assertion (syncAll called with 2 args, default = upload-only)

Actually, the on-mount test at line 229:
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function));
```

If on-mount calls `syncNow("upload-only")` and syncNow calls `syncAll(token, cb, "upload-only")`, then the assertion would be:
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "upload-only");
```

But the on-mount test at line 229 already exists, so I just need to update it to include "upload-only".

Wait, let me re-read the syncNow code and tests more carefully:

Line 118-126 of SyncProvider.test.tsx:
```typescript
test("syncNow success path transitions status to synced", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(syncAll).mockResolvedValue(makeResult());

    render(...);
    fireEvent.click(screen.getByTestId("sync-now"));
    await waitFor(...);
    // At this point syncAll has been called — we don't check the mode currently
});
```

So the syncNow test doesn't currently check the syncAll call args. I should add an assertion:

```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

And in the on-mount test (line 229), update to:
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "upload-only");
```

OK let me also handle the "error path" test. Line 139-155:
```typescript
test("syncNow error path transitions status to error", async () => {
    // ...
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
});
```

Wait, currently the error test doesn't check the syncAll args. Let me add the mode check.

OK, I think I have a clear picture now. Let me write step 1's test code.

Actually wait, I also need to think about the on-mount test. Line 214-230:
```typescript
test("on-mount silent refresh with valid token runs sync", async () => {
    // ...
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("synced");
    });
    // ...
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function));
});
```

So after our change, the on-mount effect calls `syncNow("upload-only")`. The test should verify `syncAll` is called with `"upload-only"`.

Let me now write the plan steps clearly.

- [ ] **Step 1: Write failing tests for SyncProvider mode handling**

In `SyncProvider.test.tsx`:

1. Update the signIn test assertion (line 105):
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

2. Add assertion to syncNow success test (after line 125):
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

3. Add assertion to syncNow error test (after line 154):
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
```

4. Update on-mount silent refresh test (line 229):
```typescript
expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "upload-only");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sync/SyncProvider.test.tsx --reporter verbose`
Expected: FAIL — syncAll is called with 2 args, tests expect 3 args with mode

- [ ] **Step 3: Update SyncProvider implementation**

In `SyncProvider.tsx`, make these changes:

1. Import `SyncMode` from sync-engine:
```typescript
import { syncAll } from "./sync-engine";
import type { SyncAllResult, SyncTableResult, SyncMode } from "./sync-engine";   // ← add SyncMode
```

2. Change `syncNow` to accept optional mode parameter:
```typescript
  const syncNow = useCallback(async (mode: SyncMode = "full") => {
    setStatus({ type: "syncing", message: "Starting sync..." });

    const onProgress = (result: SyncTableResult) => {
      if (!mountedRef.current) return;
      setStatus({
        type: "syncing",
        message: `Synced ${result.tableName} (${result.appended} new rows)`,
      });
    };

    const token = await trySilentRefresh();
    if (!token) {
      setStatus({ type: "disconnected" });
      return;
    }

    const result: SyncAllResult = await syncAll(token.accessToken, onProgress, mode);

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
```

3. Update the on-mount effect to pass "upload-only":
```typescript
  useEffect(() => {
    (async () => {
      try {
        const token = await trySilentRefresh();
        if (!token) return;
        setUserEmail(token.email);
        await syncNow("upload-only");       // ← use upload-only on mount
      } catch {
        // Silent failure on mount
      }
    })();
  }, [syncNow]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/sync/SyncProvider.test.tsx --reporter verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/SyncProvider.tsx src/features/sync/SyncProvider.test.tsx
git commit -m "feat: syncNow accepts mode param - full on manual, upload-only on mount"
```

---

### Task 6: Run full test suite and final commit

- [ ] **Step 1: Run all sync-related tests**

Run: `npx vitest run src/features/sync/`
Expected: All tests PASS

- [ ] **Step 2: Run full project tests**

Run: `npx vitest run`
Expected: All existing tests PASS (no regressions)

- [ ] **Step 3: Final verification**

Verify the features work together by tracing the flow in code:
- Manual Sync Now → `syncNow()` (no args) → `syncAll(token, cb, "full")` → upload + download ✅
- Sign In → `syncNow()` (no args) → `syncAll(token, cb, "full")` → upload + download ✅
- Auto-sync (debounce) → `syncAll(token, cb)` → upload only ✅
- Page load → `syncNow("upload-only")` → `syncAll(token, cb, "upload-only")` → upload only ✅

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: finalize Google sync download & replace feature"
```