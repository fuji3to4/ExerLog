# Design Spec: Google Drive Sync (Sheets API)

**Date**: 2026-06-22
**Status**: Draft
**Author**: AI Assistant (Brainstorming Session)

---

## 1. Overview

Add Google Drive integration to ExerLog that syncs all IndexedDB data to a Google Spreadsheet. Google Drive is the master (aggregate view); IndexedDB remains the local cache. Sync is one-directional (IndexedDB → Google Sheets).

### Key Goals

- **Keep IndexedDB** as the primary local store — all app functionality works offline on local data
- **On Google login**, automatically sync local data to a spreadsheet in the user's Google Drive
- **Spreadsheet** serves as the cross-device unified view — open it anytime in Google Sheets
- **No server** — works within Next.js static export (PWA)

---

## 2. Authentication & Token Management

### 2.1 Identity Provider

Use **Google Identity Services (GIS)** — the modern successor to `gapi`/`gapi.auth2`.

### 2.2 OAuth Scopes

| Scope | Purpose |
|---|---|
| `https://www.googleapis.com/auth/drive.file` | Create/find "ExerLog Data" spreadsheet (app-created files only) |
| `https://www.googleapis.com/auth/spreadsheets` | Read/write sheet data |

### 2.3 Token Lifecycle

```
App startup
  ├─ IndexedDB has stored token? → silent refresh via GIS
  │   ├─ Success → trigger sync
  │   └─ Fail (expired/revoked) → show sign-in button
  └─ No token → show sign-in button

Sign-in flow:
  1. User clicks Google Sign-In button (GIS renders it)
  2. OAuth popup appears → user consents
  3. Access token returned → stored in IndexedDB
  4. Sync starts automatically
```

### 2.4 Required GCP Setup

| Item | Detail |
|---|---|
| GCP API | Sheets API + Drive API enabled |
| OAuth consent screen | External user type, scopes as above |
| Client ID | Web application type |
| Authorized JS origins | `https://fuji3to4.github.io`, `http://localhost:3000` |

### 2.5 Sign-Out

- Settings page: "Disconnect Google Drive" button
- Clears stored token from IndexedDB
- Spreadsheet remains in Drive (data is not deleted)

### 2.6 Token Storage

Token data is stored in a dedicated Dexie table called `googleAuth`:

```
googleAuth: "key"   // key-value store: "access_token" → token string
```

The token object includes:
- `access_token` (short-lived, ~1 hour)
- `expires_at` (Unix timestamp for expiry check)
- `email` (user's Google account email for display)

GIS handles token refresh internally; the stored token is the current live token at any point.

---

## 3. Spreadsheet Structure

### 3.1 File

- **Name**: `ExerLog Data`
- **Location**: Google Drive root (no specific folder)
- **Creation**: Auto-created on first sync if not found
- **Duplicate handling**: If multiple files named "ExerLog Data" exist, use the first one returned by Drive API (most recently modified). This is rare for an app-created file

### 3.2 Sheet Tabs (6)

**① ExerciseLogs**

| id | date | exerciseId | result | loggedAt |
|---|---|---|---|---|

**② DailyWellness**

| date | physicalScore | mentalScore | note | updatedAt |
|---|---|---|---|---|

**③ DailyMetrics**

| id | date | metricType | value | unit | recordedAt |
|---|---|---|---|---|---|

**④ DailySelfCare**

| id | date | selfCareId | isDone | count | minutes | note | recordedAt |
|---|---|---|---|---|---|---|---|

**⑤ Exercises** (Master)

| id | title | description | videoUrl | thumbnailUrl | bodyArea | purpose | durationMinutes | intensity |
|---|---|---|---|---|---|---|---|---|

**⑥ SelfCareCatalog** (Master)

| id | title | description | sortOrder | isArchived |
|---|---|---|---|---|

### 3.3 Creation Flow

1. On first sync, search Drive for "ExerLog Data" via Drive API (by name)
2. If not found, use Sheets API `spreadsheets.create` with 6 sheets
3. Write header row (column names) to each sheet
4. If found, use the existing spreadsheet as-is (append mode)

---

## 4. Sync Algorithm (Sync Engine)

### 4.1 Entry Point

Triggered in two scenarios:
1. **App startup** — if a valid token exists (silent auth), run sync automatically
2. **Manual "Sync Now" button** — on the Settings page

### 4.2 Per-Table Logic

```
for each table (6 tables, processed sequentially):
  1. Sheets API: GET entire column of key values (id or date)
  2. IndexedDB: read all records
  3. Compare: for each IndexedDB record, if its key (id/date) does NOT exist in the sheet:
     → append it via Sheets API append()
```

### 4.3 Dedup Key by Table

| Table | Key Column | Note |
|---|---|---|
| ExerciseLogs | `id` | UUID |
| DailyWellness | `date` | 1 entry per day |
| DailyMetrics | `id` | UUID |
| DailySelfCare | `id` | UUID |
| Exercises | `id` | UUID (master) |
| SelfCareCatalog | `id` | UUID (master) |

### 4.4 API Efficiency

- **Read**: Single `spreadsheets.values.get` range request per sheet
- **Write**: Batch `spreadsheets.values.append` with `ValueInputOption=USER_ENTERED`
- **Split**: If >10 new rows, split into batches of 10 to stay under API limits
- **Progress**: Each table completion updates a progress callback for UI feedback

### 4.5 Safety

- Each table is wrapped in its own `try/catch`
- One table failure does not block others
- Partial success is reported: "Synced 5/6 tables. DailyMetrics failed."

---

## 5. UI Components

### 5.1 Files to Create

| File | Responsibility |
|---|---|
| `src/features/sync/SyncProvider.tsx` | React context: auth state, sync status, token lifecycle |
| `src/features/sync/google-auth.ts` | GIS init, sign-in, sign-out, token save/load |
| `src/features/sync/google-sheets.ts` | All Sheets API calls (find, create, read, append) |
| `src/features/sync/sync-engine.ts` | Orchestration: iterate tables, compare keys, batch append |
| `src/features/settings/components/google-drive-settings.tsx` | Settings UI component |

### 5.2 Sync Status Type

```typescript
type SyncStatus =
  | { type: "disconnected" }
  | { type: "syncing"; message: string; progress: number }       // e.g. "5/6 tables"
  | { type: "synced"; lastSynced: Date }
  | { type: "error"; message: string; partial: boolean };
```

### 5.3 Settings UI Mockup

```
┌─ Settings ──────────────────────────┐
│                                      │
│  ┌─ Google Drive ───────────────┐   │
│  │                               │   │
│  │  [Sign in with Google]        │   │
│  │                               │   │
│  │  — or when connected —        │   │
│  │  ✅ user@gmail.com            │   │
│  │  Last synced: 2026/06/22 10:30│   │
│  │                               │   │
│  │  [Sync Now]  [Disconnect]     │   │
│  │                               │   │
│  │  — during sync —              │   │
│  │  [████████░░░░] Syncing...    │   │
│  └───────────────────────────────┘   │
│                                      │
│  [Existing settings sections...]     │
└──────────────────────────────────────┘
```

### 5.4 Provider Placement

`<SyncProvider>` wraps the app in `layout.tsx` (client-side boundary), runs token check on mount.

---

## 6. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| **Offline** | Skip sync silently. Next startup or "Sync Now" retries |
| **Token expired** | GIS auto-refresh; fall back to sign-in button on failure |
| **Consent revoked** | Same as above — show sign-in prompt |
| **API rate limit** | Exponential backoff (max 3 retries), per-table independent |
| **Single table failure** | Log and report; continue with remaining tables |
| **Spreadsheet deleted** | Re-create on next sync |
| **Sheet tab deleted** | Re-create tab + write headers on next sync |
| **Large data (1st sync)** | Batch append (10 rows/request); UI shows progress |
| **Multi-device append** | Append-only avoids conflicts; duplicate rows possible but harmless |

---

## 7. Non-Goals (Out of Scope)

- **Two-way sync** — not implemented. Spreadsheet never pushes back to IndexedDB
- **Real-time sync** — no WebSocket or Drive push notifications. Sync at startup + manual
- **Spreadsheet editing** — the spreadsheet is a read-only aggregate view. Editing it in Google Sheets won't affect the app
- **Legacy `conditions` table** — excluded from sync (migrated to DailyWellness)
- **Conflict resolution** — not needed for one-directional append-only