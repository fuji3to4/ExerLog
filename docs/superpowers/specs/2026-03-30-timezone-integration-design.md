# Timezone Integration Design

**Date:** 2026-03-30  
**Status:** Draft (revised)

## Problem

ExerLog stores `loggedAt` (exercise logs) and `updatedAt` (daily conditions) using `new Date().toISOString()`, which produces UTC-only strings (e.g., `2024-03-30T05:32:00.000Z`). These are opaque without knowing to convert from UTC. The CSV export passes them through as-is, and the history page never displays them at all.

## Goal

1. Store `loggedAt` and `updatedAt` as local-time ISO 8601 strings with timezone offset (e.g., `2024-03-30T14:32:00+09:00`), making stored data self-describing.
2. Always use the browser's local timezone (via `Intl.DateTimeFormat().resolvedOptions().timeZone`) — no language-to-timezone mapping.
3. Display `loggedAt` and `updatedAt` as local time (`HH:MM`) on the history page.
4. Export `loggedAt` and `updatedAt` as `YYYY-MM-DD HH:MM` (browser local time) on CSV export.

## Out of Scope

- A separate timezone selector UI.
- Showing a timezone label (e.g., "JST") next to timestamps in the UI or CSV.
- Migration of existing UTC records — legacy `...Z` strings are handled gracefully at read time.

---

## Architecture

### Approach: Store with offset, display via browser TZ

Timestamps are written using a new utility that captures the browser's current local time **with its UTC offset**. This makes stored data self-describing: `2024-03-30T14:32:00+09:00` is readable without needing to know the user's timezone later.

For display and export, `new Date(isoString)` correctly parses both offset strings and legacy UTC strings into the same UTC instant. `Intl.DateTimeFormat` with the browser's local timezone then formats it consistently.

**Legacy data (`...Z` strings):** Reading them through `new Date(str)` + local-TZ formatting works correctly — no migration needed.

---

## Components

### 1. `src/lib/date/local-iso.ts` (new)

Generates a local-time ISO 8601 string with timezone offset for use when saving timestamps:

```typescript
// Returns e.g. "2024-03-30T14:32:00+09:00"
export function localIsoNow(): string {
  const now = new Date();
  const offsetMs = -now.getTimezoneOffset() * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  const sign = offsetMs >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(now.getTimezoneOffset()) / 60)).padStart(2, "0");
  const m = String(Math.abs(now.getTimezoneOffset()) % 60).padStart(2, "0");
  return `${local.toISOString().slice(0, 19)}${sign}${h}:${m}`;
}
```

All places that currently write `new Date().toISOString()` for `loggedAt` or `updatedAt` are updated to use `localIsoNow()`.

### 2. `src/lib/date/format-timestamp.ts` (new)

Two utilities for rendering timestamps. Both accept any valid ISO 8601 string (offset or `Z`) and use `Intl.DateTimeFormat` with the browser's local timezone:

```typescript
// For history page: "14:32"
export function formatTime(isoString: string): string

// For CSV export: "2024-03-30 14:32"
export function formatTimestampForCsv(isoString: string): string
```

Both return `""` for empty or invalid input.

### 3. Timestamp write sites (modified)

Replace `new Date().toISOString()` → `localIsoNow()` in these three files:
- `src/features/storage/exercise-logs.repository.ts` — `loggedAt` on create
- `src/features/storage/daily-condition.repository.ts` — `updatedAt` on save
- `src/features/history/components/day-summary.tsx` — `updatedAt` inside `handleSaveCondition`

**Note:** `loggedAt` is **not** regenerated on log edit — only on initial creation. This is existing intended behavior and should be preserved.

### 4. History page (`src/features/history/`)

- `HistoryDayLog.loggedAt` **already exists** in `history-query.ts` — no type change needed
- `HistoryDaySummary`: add `updatedAt: string | null` (currently missing)
- `history-query.ts`: map `updatedAt` from the condition record into `HistoryDaySummary`
- `DaySummary` component: render `formatTime(log.loggedAt)` next to each log entry; render `formatTime(summary.updatedAt)` next to the condition entry; suppress when empty

### 5. CSV export (`src/features/settings/csv/history-csv.ts`)

Replace raw timestamp fields with `formatTimestampForCsv(ts)` — no `timezone` parameter needed (browser TZ used internally):

```typescript
export function generateExerciseLogsCsv(logs, exerciseTitleMap): string
//  loggedAt column: formatTimestampForCsv(log.loggedAt)

export function generateConditionsCsv(conditions): string
//  updatedAt column: formatTimestampForCsv(c.updatedAt)
```

`data-management.tsx` requires no change to its call sites (signatures unchanged).

---

## Data Flow

```
Save exercise log / condition:
  localIsoNow() → "2024-03-30T14:32:00+09:00" → stored in DB

History page:
  DB record → loggedAt / updatedAt (offset or legacy Z string)
  formatTime(loggedAt) → new Date(s) → Intl (browser TZ) → "14:32"

CSV export:
  DB record → loggedAt / updatedAt
  formatTimestampForCsv(ts) → "2024-03-30 14:32"
```

---

## Error Handling

| Case | Behaviour |
|------|-----------|
| `loggedAt` / `updatedAt` is empty string | `formatTime("")` returns `""`, UI suppresses display |
| Invalid ISO string | `new Date(s)` returns `Invalid Date`; `isNaN(d.getTime())` check returns `""` |
| Legacy UTC string (`...Z`) | Parsed correctly by `new Date()`; formatted in browser TZ |
| `Intl.DateTimeFormat` unavailable | Falls back to `Date.prototype.toLocaleTimeString()` |

---

## Testing

- **`local-iso.test.ts`**: `localIsoNow()` returns a string matching `/T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/`; offset matches `new Date().getTimezoneOffset()`
- **`format-timestamp.test.ts`**: `formatTime` and `formatTimestampForCsv` with fixed offset strings and legacy `Z` strings; empty/invalid input returns `""`
- **`history-csv.test.ts`** (existing, if any): update to assert new `YYYY-MM-DD HH:MM` format for timestamp columns
- **History component tests**: assert time strings appear in rendered output for log entries and condition

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/date/local-iso.ts` | New — `localIsoNow()` |
| `src/lib/date/format-timestamp.ts` | New — `formatTime()`, `formatTimestampForCsv()` |
| Storage/mutation write sites | Replace `new Date().toISOString()` with `localIsoNow()` for `loggedAt` / `updatedAt` |
| `src/features/history/` (types + query + component) | Add `updatedAt` to summary type/query; display times in `DaySummary` |
| `src/features/settings/csv/history-csv.ts` | Format timestamp columns with `formatTimestampForCsv()` |
