# Design: Video Content CRUD, CSV Import/Export, History Edit/Delete

**Date:** 2026-03-25  
**Status:** Approved

---

## Problem Statement

Currently, exercise videos are hardcoded in `exercise-catalog.ts` — users cannot add, edit, or delete exercises. There is no import/export capability for any data. History entries (exercise logs and daily conditions) cannot be edited or deleted after they are created.

This design introduces:
1. User-managed exercise library backed by IndexedDB
2. CSV import/export for video content and history
3. Inline edit/delete for history entries
4. A new Settings screen as the management hub

---

## Architecture

### Storage Layer Changes

A new `exercises` table is added to the existing Dexie database (`exercise-log-mvp`):

```
Table: exercises
  id             string  (primary key)
  title          string
  description    string
  videoUrl       string
  thumbnailUrl   string
  bodyArea       string   // "upper-body" | "lower-body" | "full-body"
  purpose        string   // "warmup" | "mobility" | "strength" | "recovery" | "endurance"
  durationMinutes number
  intensity      string   // "low" | "medium" | "high"
```

This mirrors the existing `ExerciseVideo` type in `src/lib/types.ts` exactly. No type changes needed.

**Seed strategy:** On first app launch (when the `exercises` table is empty), the app seeds it with the current 6 sample exercises from `exercise-catalog.ts`. After that, the user owns the data. `exercise-catalog.ts` is kept as the seed source but is no longer the runtime source of truth.

**New repository:** `src/features/storage/exercise-catalog.repository.ts`
- `listAll(): Promise<ExerciseVideo[]>`
- `getById(id: string): Promise<ExerciseVideo | undefined>`
- `add(exercise: ExerciseVideo): Promise<void>`
- `update(exercise: ExerciseVideo): Promise<void>`
- `remove(id: string): Promise<void>`
- `replaceAll(exercises: ExerciseVideo[]): Promise<void>` (used by CSV import)
- `seedIfEmpty(): Promise<void>` (called once at app startup)

**Affected existing code:** All call sites that use `exercise-catalog.ts` directly (library page, recommendations, today view) must be updated to call the new repository instead.

---

## Settings Screen

A new page is added at `/settings` with a corresponding tab in the bottom navigation.

**Bottom navigation (updated):**
```
ホーム | ライブラリ | 履歴 | 設定
```

The Settings screen is divided into two sections:

### Section: ライブラリ管理 (Library Management)

- Displays a list of all exercises from IndexedDB
- Each item has an **Edit** button (opens edit modal) and a **Delete** button (with confirmation dialog)
- A **＋ 追加** (Add) button opens the add/edit modal
- The add/edit modal fields: title, description, videoUrl, thumbnailUrl, bodyArea (select), purpose (select), durationMinutes (number), intensity (select)
- `id` is auto-generated (UUID) for new exercises; preserved for edits

### Section: データ管理 (Data Management)

Four export/import actions:

| Action | Description |
|--------|-------------|
| 動画コンテンツをエクスポート | Downloads all exercises as `exercises.csv` |
| 動画コンテンツをインポート | Uploads a CSV; replaces all exercises (confirmation dialog required) |
| 運動ログをエクスポート | Downloads all exercise logs as `exercise-logs.csv` |
| 体調記録をエクスポート | Downloads all condition entries as `conditions.csv` |

---

## CSV Formats

### exercises.csv
```
id,title,description,videoUrl,thumbnailUrl,bodyArea,purpose,durationMinutes,intensity
```
- On import: the file must contain all columns. Unknown columns are ignored.
- Rows with missing required fields (title, videoUrl, bodyArea, purpose, durationMinutes, intensity) are skipped with a warning.
- Import replaces all existing exercises atomically.

### exercise-logs.csv
```
date,exerciseId,exerciseTitle,result,loggedAt
```
- `exerciseTitle` is denormalized at export time (looked up from exercises table)
- Export only; no import

### conditions.csv
```
date,conditionLevel,note,updatedAt
```
- Export only; no import

---

## History Edit / Delete

Changes are made to the existing history screen (`/history`).

**In `day-summary.tsx`:**

Each exercise log entry gets:
- ✏️ **Edit** button → opens `EditLogModal` with fields: date (date picker), exercise (select from exercises list), result (select: did/partial/could_not)
- 🗑️ **Delete** button → confirmation dialog → calls `exercise-logs.repository.deleteById(id)`

The daily condition entry (if present) gets:
- ✏️ **Edit** button → opens `EditConditionModal` with fields: conditionLevel (select: good/okay/tired), note (textarea)
- 🗑️ **Delete** button → confirmation dialog → calls `daily-condition.repository.deleteByDate(date)`

**New repository methods needed:**
- `exercise-logs.repository.ts`: add `updateLog(log: ExerciseLog)`, `deleteById(id: string)`
- `daily-condition.repository.ts`: add `updateCondition(entry: DailyConditionEntry)`, `deleteByDate(date: string)`

After any edit or delete, the history view refreshes to show updated data.

---

## Component Structure

```
src/
├── app/
│   └── settings/
│       └── page.tsx                     # New Settings page route
├── features/
│   ├── settings/                        # New feature module
│   │   ├── components/
│   │   │   ├── settings-screen.tsx      # Main settings layout
│   │   │   ├── library-management.tsx   # Exercise list + add/edit/delete
│   │   │   ├── exercise-form-modal.tsx  # Add/edit exercise modal
│   │   │   └── data-management.tsx      # CSV import/export buttons
│   │   └── csv/
│   │       ├── exercise-csv.ts          # parse/generate exercise CSV
│   │       └── history-csv.ts           # generate history CSVs
│   ├── storage/
│   │   ├── app-db.ts                    # Updated: add exercises table
│   │   └── exercise-catalog.repository.ts  # New
│   └── history/
│       └── components/
│           └── day-summary.tsx          # Updated: add edit/delete buttons
└── components/
    └── app-shell/
        └── bottom-nav.tsx              # Updated: add 設定 tab
```

---

## Error Handling

- **CSV import validation:** Rows with missing required fields show a per-row warning after import. The import still proceeds with valid rows.
- **Deleting an exercise that has logs:** Show a warning ("この運動には XX 件のログがあります。削除すると履歴での表示名が変わることがあります。") and require confirmation. Do not cascade-delete logs — log entries retain their `exerciseId` even if the exercise is removed.
- **Empty exercise list:** Show a prompt to add exercises or import a CSV.
- **Confirmation dialogs:** Required for: exercise delete, exercise import (full replace), log delete, condition delete.

---

## Out of Scope

- History CSV import (export only)
- Condition data import
- Cloud backup or sync
- Sharing exercises between users
- Undo / undo history for deletions

---

## Implementation Notes

- Use the browser's `<a download>` pattern for CSV file downloads (no server needed)
- Use `<input type="file" accept=".csv">` for CSV upload, parse with a simple split/map (no external CSV library needed given the simple flat structure)
- `replaceAll` on exercises should use a Dexie transaction to atomically clear + bulk-add
- i18n: all new UI strings must be added to both EN and JA message files
