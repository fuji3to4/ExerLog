# Timestamp Display & Timezone-Aware CSV Export Design

**Date:** 2026-03-30
**Status:** Draft

## Problem

1. Exercise log timestamps (`loggedAt`) and condition record timestamps (`updatedAt`) are stored
   as ISO 8601 UTC strings but are never shown in the history UI.
2. CSV exports include these fields as raw UTC strings, making them hard to read without
   manual conversion.

## Goals

1. Show the recorded time for each exercise log and condition entry in the History day-summary view.
2. Convert `loggedAt` / `updatedAt` to the user's selected timezone in CSV exports, and include
   a `timezone` column so the context is clear.

## Out of Scope

- Changing how or when timestamps are recorded (storage schema unchanged)
- Editing the `loggedAt` / `updatedAt` values through the UI
- Showing seconds in either display or CSV

---

## Architecture

### New helper functions in `formatting.ts`

#### `formatTime(isoString, language, timezone?)`

Formats the **time-only** part of an ISO string for display in the UI.

```ts
export function formatTime(isoString: string, language: Language, timezone?: string): string {
  const date = new Date(isoString);
  const locale = language === "ja" ? "ja-JP" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    ...(timezone ? { timeZone: timezone } : {}),
  }).format(date);
}
```

Result examples (Asia/Tokyo):
- Japanese: `14:32`
- English: `2:32 PM`

#### `formatLocalDatetime(isoString, timezone)`

Formats a full datetime as `YYYY-MM-DD HH:MM:SS` in the given timezone for CSV export.
Uses `hourCycle: "h23"` to ensure midnight renders as `00` not `24`.

```ts
export function formatLocalDatetime(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
```

---

### Modified files

| File | Change |
|------|--------|
| `src/features/i18n/formatting.ts` | Add `formatTime()` and `formatLocalDatetime()` |
| `src/features/i18n/use-translation.ts` | Expose `formatTime` in the hook return value |
| `src/features/history/components/day-summary.tsx` | Show `loggedAt` time per exercise; show `updatedAt` time for condition |
| `src/features/settings/csv/history-csv.ts` | Add `timezone` param; convert timestamps via `formatLocalDatetime`; add `timezone` column |
| `src/features/settings/components/data-management.tsx` | Call `useTimezone()` and pass timezone to CSV generators |
| `src/app/globals.css` | Add `.day-summary__time` style (small, muted) |

---

## Detailed Design

### History UI — time display

In `day-summary.tsx`, each exercise log row gains a small time label:

```
┌──────────────────────────────────────────┐
│ Exercises                                │
│                                          │
│ Shoulder Roll    Did it   14:32  [Edit] [Del] │
│ Hip Mobility     Partly   09:15  [Edit] [Del] │
│                                          │
│ Condition                                │
│ Feeling good                  18:44      │
│ "Felt energetic today"                   │
│ [Edit] [Delete]                          │
└──────────────────────────────────────────┘
```

- `formatTime(log.loggedAt)` is called via the `useTranslation()` hook's new `formatTime` wrapper
- The time appears as a small muted `<span>` with class `day-summary__time`
- Position: after the result badge, before the action buttons (for logs); after the condition text (for condition section)

### CSV Export format

**exercise-logs.csv** (with timezone `Asia/Tokyo`):

```csv
date,exerciseId,exerciseTitle,result,loggedAt,timezone
2026-03-30,shoulder-roll-4,Shoulder Roll,did,2026-03-30 14:32:00,Asia/Tokyo
2026-03-29,hip-mobility-6,Hip Mobility,partial,2026-03-29 09:15:00,Asia/Tokyo
```

**conditions.csv** (with timezone `Asia/Tokyo`):

```csv
date,conditionLevel,note,updatedAt,timezone
2026-03-30,good,Felt energetic today,2026-03-30 18:44:00,Asia/Tokyo
```

The `timezone` value is one entry per row (same value for all rows in a single export).
This makes the file self-documenting: a user opening the CSV can immediately see the timezone context.

### Passing timezone to CSV

`DataManagement` component currently calls `generateExerciseLogsCsv(logs, titleMap)` and
`generateConditionsCsv(conditions)`. It will:
1. Call `useTimezone()` to read `timezone`
2. Pass `timezone` to both generators as a third parameter

The function signatures become:
```ts
generateExerciseLogsCsv(logs, titleMap, timezone: string): string
generateConditionsCsv(conditions, timezone: string): string
```

---

## Data Flow

```
User clicks "Export exercise logs (CSV)"
  → handleExportLogs() in DataManagement
    → useTimezone() → timezone = "Asia/Tokyo"
    → generateExerciseLogsCsv(logs, titleMap, timezone)
      → formatLocalDatetime(log.loggedAt, "Asia/Tokyo")
        → "2026-03-30 14:32:00"
    → CSV downloaded with timezone column

History screen — DaySummary renders a log row
  → useTranslation().formatTime(log.loggedAt)
    → formatTime(log.loggedAt, "ja", "Asia/Tokyo")
      → "14:32"
  → <span className="day-summary__time">14:32</span>
```

---

## Testing

- Add `formatTime` unit tests in `formatting.test.ts` (or create it):
  - Same ISO string renders differently in `ja-JP` vs `en-US` (24h vs 12h AM/PM)
  - Timezone offset correctly shifts the displayed time
- Add `formatLocalDatetime` unit tests:
  - UTC midnight correctly shifts to next-day morning in Asia/Tokyo
  - Output format is always `YYYY-MM-DD HH:MM:SS`
  - Midnight renders as `00:00:00` not `24:00:00`
- Update `history-csv.ts` tests if they exist (or add inline verification)
- No UI component tests required (time display is purely presentational)

---

## Backward Compatibility

- `formatTime` and `formatLocalDatetime` are new exports; no existing callers affected
- CSV column `timezone` is appended at the end — existing importers reading specific column positions by name are unaffected; positional readers may need updating but ExerLog only imports exercise catalogs (not logs or conditions), so no import path is affected
- `generateExerciseLogsCsv` and `generateConditionsCsv` gain a new required `timezone` parameter; callers are updated in the same PR
