# Design Spec: Google Sync Download & Local Replace

**Date**: 2026-06-26
**Status**: Draft
**Author**: AI Assistant (Brainstorming Session)

---

## 1. Overview

Extend the existing Google Drive sync with a **download-and-replace** phase. Currently sync is one-directional (IndexedDB → Google Sheets). This adds the reverse direction for **manual sync triggers**, making Google Sheets the source of truth that overwrites local data.

### Key Principle

- **Automatic debounce sync (30s)**: Upload-only — keeps current behavior
- **Manual "Sync Now" button / login-time sync**: Upload first, then **download all data from Google Sheets and replace local IndexedDB**
- Google Sheets is the **source of truth** for the replace phase

---

## 2. Sync Modes

| Trigger | Upload | Download & Replace |
|---------|--------|-------------------|
| Manual "Sync Now" button | ✅ Yes | ✅ Yes |
| Login (initial auth) | ✅ Yes | ✅ Yes |
| Auto-sync (30s debounce) | ✅ Yes | ❌ No |
| Page load (auto token refresh) | ✅ Yes | ❌ No |

---

## 3. Data Flow — Download & Replace Phase

### 3.1 Phase Ordering

```
syncNow() / login
  │
  ├─ Phase 1: Upload (existing logic)
  │   Read IndexedDB → append new rows to Google Sheets
  │   (Progress callback per table as before)
  │
  └─ Phase 2: Download & Replace (NEW)
      For each table (sequentially):
        1. Read ALL rows from Google Sheet (include header)
        2. Clear the corresponding IndexedDB table
        3. Bulk-write all rows (with ID preserved) into IndexedDB
      (Progress callback per table: "Downloaded X rows for {tableName}")
```

### 3.2 Why Upload First, Then Download?

1. **Upload first**: Ensures any local-only data reaches Google Sheets before the replace
2. **Download after**: Since Google is the source of truth, the downloaded data is the final state
3. **Net result**: Local data = Google data exactly — any local-only rows were uploaded in Phase 1, then come back down in Phase 2 alongside everything else

---

## 4. Implementation

### 4.1 `google-sheets.ts` — Add `readAllRows()`

New function to read all rows (including header) from a sheet tab:

```typescript
export async function readAllRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  // GET {SHEETS_API}/{spreadsheetId}/values/{sheetName}
  // Return data.values as string[][] (first row = header)
  // Return empty array on error or no data
}
```

### 4.2 `sync-config.ts` — Add `fromRow` to `TableSyncConfig`

Extend `TableSyncConfig` with a reverse mapper:

```typescript
export interface TableSyncConfig {
  keyColumn: string;
  headers: string[];
  readFromDb: () => Promise<any[]>;
  toRow: (record: any) => string[];
  fromRow: (row: string[], headers: string[]) => any;  // NEW
  clearDb: () => Promise<void>;                         // NEW
  bulkWriteDb: (records: any[]) => Promise<void>;       // NEW
}
```

**Type conversions per table:**

| Table | fromRow Notes |
|-------|---------------|
| ExerciseLogs | `id` → Number(id) |
| DailyWellness | `physicalScore`/`mentalScore` → Number(), `note` string |
| DailyMetrics | `id` → Number(id), `value` → Number(value) |
| DailySelfCare | `id` → Number(id), `isDone` → isDone==="TRUE", `count`/`minutes` → Number() or null |
| Exercises | `durationMinutes` → Number(durationMinutes) |
| SelfCareCatalog | `sortOrder` → Number(sortOrder), `isArchived` → isArchived==="TRUE" |

### 4.3 `sync-engine.ts` — Add `downloadAndReplaceAll()`

```typescript
export interface DownloadTableResult {
  tableName: string;
  rowsRead: number;
  rowsWritten: number;
  error?: string;
}

export async function downloadAndReplaceAll(
  accessToken: string,
  spreadsheetId: string,
  onProgress?: SyncProgressCallback,
): Promise<{ success: boolean; results: DownloadTableResult[] }>
```

Called **only** from `doSyncAll()` at the end if the caller signals "full sync" mode.

### 4.4 `sync-engine.ts` — Signal Full Sync vs Upload-Only

Refactor `syncAll()` to accept an optional mode flag:

```typescript
export type SyncMode = "upload-only" | "full";

export async function syncAll(
  accessToken: string,
  onProgress?: SyncProgressCallback,
  mode: SyncMode = "upload-only",           // NEW param, default = upload-only for backward compat
): Promise<SyncAllResult>
```

- Auto-sync / page-load calls `syncAll(token, cb)` → `mode` defaults to `"upload-only"`
- Manual sync / login calls `syncAll(token, cb, "full")`

### 4.5 `SyncProvider.tsx` — Pass mode on manual sync

```typescript
const syncNow = useCallback(async (mode: SyncMode = "full") => {
  // ...
  const result = await syncAll(token.accessToken, onProgress, mode);
  // ...
}, []);
```

- The manual "Sync Now" button in `google-drive-settings.tsx` calls `syncNow()` → defaults to `"full"`
- Auto-sync / page-load continues calling `syncAll` directly (or adds a separate `syncUploadOnly` path)

### 4.6 `auto-sync.ts` — No changes needed

`scheduleSync()` and `syncIfNeeded()` call `syncAll(token, cb)` without mode → upload-only. This is the default.

---

## 5. Error Handling

| Scenario | Phase 1 (Upload) | Phase 2 (Download) |
|----------|-------------------|--------------------|
| **Phase 1 fails** | Return error (existing) | Phase 2 not reached |
| **Phase 1 succeeds, Phase 2 fails mid-way** | Upload complete on Google | Local IndexedDB partially replaced. Error reported with partial flag |
| **Phase 2 readSheet fails for one table** | — | Skip that table, continue others. Error reported per-table |
| **Phase 2 write to IndexedDB fails** | — | Table left in inconsistent state — but since Google is source of truth, re-running sync fixes it |

---

## 6. Files Changed

| Action | File |
|--------|------|
| **Modify** | `src/features/sync/google-sheets.ts` — add `readAllRows()` |
| **Modify** | `src/features/sync/sync-config.ts` — add `fromRow`, `clearDb`, `bulkWriteDb` to each config |
| **Modify** | `src/features/sync/sync-engine.ts` — add `SyncMode`, refactor `syncAll`, add `downloadAndReplaceAll()` |
| **Modify** | `src/features/sync/SyncProvider.tsx` — pass `"full"` mode on manual sync |
| **Modify** | `src/features/sync/auto-sync.ts` — no functional change; default mode is `upload-only` |

No new files. No UI changes. The existing settings buttons and sync indicator remain unchanged.

---

## 7. Testing

- **sync-engine.test.ts**: Add tests for `downloadAndReplaceAll()` — verify rows are read from mock sheet, written to mock IndexedDB, old data cleared
- **SyncProvider.test.tsx**: Verify `syncNow` calls `syncAll` with `mode: "full"` on manual trigger
- **auto-sync.test.ts**: Verify `scheduleSync` calls `syncAll` without mode parameter → `"upload-only"` default

---

## 8. Out of Scope

- **Conflict resolution** — Google is always source of truth for manual sync
- **UI progress bar for Phase 2** — uses the same progress callback pattern as Phase 1
- **Selective table sync** — all 6 tables always participate
- **IndexedDB version bump** — not needed as this is pre-release (no existing user data to migrate)