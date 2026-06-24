# Google Drive Auto-Sync Design

> **Problem:** The current Google Drive sync requires a manual "Sync Now" button click. Users want a "set and forget" experience: once logged in, saving data should automatically sync to the Google Sheet without explicit action.

**Design:** Keep IndexedDB as the primary store (fast reads, offline-capable). When logged in, writes to IndexedDB trigger a 30-second debounced auto-sync to Google Sheets. A header indicator shows login state and supports in-place sign-in/sign-out.

**Architecture:**
```
User saves data
  ↓
① IndexedDB written immediately (fast, always works)
② scheduleSync() called (30s debounce timer)
③ Timer fires → syncAll() appends unsent rows to Google Sheet
④ Page load also checks for unsent data and syncs
```

---

## Data Flow

### Logged-in state
- **Reads:** Always from IndexedDB (unchanged from current behavior).
- **Writes:** To IndexedDB first, then `scheduleSync()` enqueues a background sync.
- **Sync:** 30-second debounce — if user saves multiple records in quick succession, they batch into one sync cycle.
- **Page load:** `syncIfNeeded()` runs and syncs any rows not yet sent.

### Logged-out / offline state
- All operations hit IndexedDB only. `scheduleSync()` is still called but finds no valid token and does nothing.
- On next login, `syncNow()` runs a full table sync (existing behavior).

---

## Auto-Sync Module (`src/features/sync/auto-sync.ts`)

New file, two exports:

### `scheduleSync()`
- Clears any pending debounce timer.
- Starts a 30-second timer.
- When timer fires: calls `trySilentRefresh()` → if token exists, calls `syncAll(accessToken)`.
- Called from every data-save path (repository functions).

### `syncIfNeeded()`
- Called on page load (or app mount).
- Cancels any pending debounce (timer is no longer relevant once the page reloads).
- Calls `trySilentRefresh()` → if token exists, calls `syncAll(accessToken)`.
- `syncAll` is idempotent (append-only, skips rows already present in the sheet), so it's safe to call unconditionally.

### Design Rationale
- `syncAll` already implements the correct per-table dedup logic (read column A, build a `Set`, filter out existing keys). This is reused as-is.
- No need for a "dirty flag" — `syncAll` is cheap enough to run on every debounce fire; already-synced rows cost one column read per table.
- The SyncProvider's existing on-mount `syncNow()` already covers page-load sync for the "login transition" case.

---

## SyncIndicator Component (`src/features/shell/components/sync-indicator.tsx`)

New component added to the AppShell header, rendered right of the LanguageSwitcher.

### Layout

```
[ ExerLog ]                        [ JA / EN ]    [ 🔒 ]
```

### States

| Status | Display | Click Action |
|--------|---------|-------------|
| `disconnected` | 🔓 (or muted icon) | Triggers `signIn()` → Google OAuth popup |
| `synced` | 🔒 + short email (e.g. "user@g...") | Toggles dropdown with "Disconnect" button |
| `syncing` | 🔄 animated | No action (disabled) |
| `error` | ⚠️ | Toggles dropdown with warning + "Settings" link |

### Behavior
- Uses `useSync()` from `SyncProvider` for status, userEmail, signIn, disconnect.
- Clicking the indicator while disconnected triggers sign-in directly (no intermediate dialog).
- Clicking while connected toggles a simple absolute-positioned popover with:
  - User email (full)
  - "Disconnect" button → calls `disconnect()`
- The dropdown closes on click-outside or on disconnect.

### Styling
- Uses same visual language as `LanguageSwitcher` (`rounded-full`, `bg-muted`, small type).
- Icon-only on very narrow screens (email hidden).

---

## Integration Points — scheduleSync() Calls

### Approach: Repository-level hooking

Add `scheduleSync()` calls inside the five IndexedDB repository files, right after each successful write operation. This is the most maintainable location — every save path passes through these repositories.

| Repository File | After Function(s) |
|----------------|-------------------|
| `src/features/storage/exercise-logs.repository.ts` | `saveExerciseLog()`, `updateExerciseLog()` |
| `src/features/storage/daily-condition.repository.ts` | `saveDailyCondition()`, `updateDailyCondition()` |
| `src/features/storage/daily-wellness.repository.ts` | `saveDailyWellness()` |
| `src/features/storage/daily-metrics.repository.ts` | `upsertDailyMetric()`, `replaceDailyMetrics()` |
| `src/features/storage/daily-self-care.repository.ts` | `replaceDailySelfCareEntries()` |

Each function gets one additional line after the `appDb` write:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
// ...
await appDb.logs.put(entry);
scheduleSync(); // ← added
```

### Page-load sync

`syncIfNeeded()` is called from the `SyncProvider` on-mount effect alongside the existing `syncNow()` logic. This ensures:
1. On login token recovery → full sync (existing)
2. On page load with existing token → auto-sync of any unsent rows (new)

---

## What Stays Unchanged

- **SyncProvider.tsx** — adds `syncIfNeeded()` call in the on-mount effect alongside the existing syncNow(). No other changes.
- **google-auth.ts** — unchanged.
- **google-sheets.ts** — unchanged.
- **sync-engine.ts / sync-config.ts** — unchanged.
- **google-drive-settings.tsx** — unchanged (manual "Sync Now" and "Disconnect" remain in Settings).
- **i18n messages** — one or two keys added for the SyncIndicator (sign-in tooltip, disconnect label).

---

## Files Changed

| Action | File |
|--------|------|
| **Create** | `src/features/sync/auto-sync.ts` |
| **Create** | `src/features/shell/components/sync-indicator.tsx` |
| **Modify** | `src/components/app-shell/app-shell.tsx` — import and render `<SyncIndicator />` |
| **Modify** | `src/features/storage/exercise-logs.repository.ts` — add `scheduleSync()` |
| **Modify** | `src/features/storage/daily-condition.repository.ts` — add `scheduleSync()` |
| **Modify** | `src/features/storage/daily-wellness.repository.ts` — add `scheduleSync()` |
| **Modify** | `src/features/storage/daily-metrics.repository.ts` — add `scheduleSync()` |
| **Modify** | `src/features/storage/daily-self-care.repository.ts` — add `scheduleSync()` |
| **Modify** | `src/features/sync/SyncProvider.tsx` — add `syncIfNeeded()` call on mount |
| **Modify** | `src/features/i18n/messages/en.ts` — add indicator labels |
| **Modify** | `src/features/i18n/messages/ja.ts` — add indicator labels |

---

## Testing

- **auto-sync.test.ts:** Verify debounce timing, verify `syncAll` is called after delay, verify no-op when no token.
- **sync-indicator.test.tsx:** Verify all 4 states render correctly, verify click triggers signIn/disconnect.
- **repository tests:** Existing tests continue to pass (the `scheduleSync()` import is a no-op in test environment unless mocked).
- **SyncProvider.test.tsx:** Verify `syncIfNeeded()` is called on mount.

No changes needed to the sync engine test suite.

---

## Open Questions (Resolved During Brainstorming)

- **Sync direction:** IndexedDB → Sheet (unchanged, append-only).
- **Read source during login:** Always IndexedDB (fast, offline-capable).
- **Sync timing:** 30-second debounce after last write. On page load, sync immediately.
- **Header indicator:** Rightmost position in header bar. Toggle between sign-in and sign-out.
- **Login state indicator in Settings:** Remains unchanged; both the header indicator and settings section coexist.