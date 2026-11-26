# Module End Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One ruler rule (end time → bar, none → line) for every module, and an optional end time for custom modules that opt in with `hasEnd`, with built-in selfcare switched from a minutes field to an end time.

**Architecture:** The ruler drops its "runs to now" branch. Custom definitions gain `hasEnd?: boolean`; custom records gain `endedAt?: string`, which flows through the form, timeline card, CSV and Sheets sync. The ruler already reads `ModuleRecord.endedAt`, so custom records become bars with no ruler change beyond Task 1.

**Tech Stack:** Next.js static export, React, TypeScript, Dexie, Vitest 3.0.8.

**Spec:** `docs/superpowers/specs/2026-11-26-module-end-time-design.md`

## Global Constraints

- No "ongoing" state anywhere: a record without an end time is a line; nothing runs to "now".
- No reminders or warnings about missing end times; the end input is always optional.
- End input is a time only (`HH:mm`). End earlier than start → next day. End equal to start → no end.
- `endedAt` is stored as a local ISO string in the same format as `recordedAt`, and is absent (property not present) when there is no end.
- `endedAt` is a reserved field id for every definition (`reserved_field_id`).
- Modules without `hasEnd: true` behave exactly as today (form, card, CSV, sync).
- No migration of old selfcare `minutes` values.

## Review Focus

1. Editing a record that has an end and clearing the end input → saved record has no `endedAt` property (not `""`, not `null`). (Test in Task 3.)
2. Editing the start time of a record that has an end → the end is recomputed against the new start (end before new start → next day). (Test in Task 3.)
3. Sheets row with an empty `endedAt` cell, or a sheet with no `endedAt` column at all (older data) → record without `endedAt`. (Test in Task 2.)
4. A record with `endedAt` in a module whose definition later drops `hasEnd` → the value is kept and still exported/synced, not lost. (Test in Task 2.)
5. A user-edited selfcare definition (not an untouched seed) → not overwritten by the new shipped one. (Test in Task 4.)

---

### Task 1: One ruler rule — no "runs to now"

**Files:**
- Modify: `src/features/timeline/ruler-layout.ts` (remove the `endedAt === null && nowHours` branch; remove `nowHours` from `layoutRuler`'s options)
- Modify: `src/features/timeline/components/day-ruler.tsx` (stop passing `nowHours` to `layoutRuler`; keep it for the now line)
- Modify: `src/features/modules/types.ts:16` doc comment on `endedAt` → "When set, the record spans recordedAt → endedAt; otherwise it is a moment."
- Test: `src/features/timeline/ruler-layout.test.ts`

**Interfaces:**
- Produces: `layoutRuler(items, opts: { start: number; span: number }): { clips: RulerClip[]; rows: number }`

- [ ] **Step 1: Update tests.** Replace "open-ended module runs to now on today" with `module with endedAt null is a point even on today` (compression 08:00, `endedAt: null` → `isPoint true`, `width 0`). Delete "open-ended module started after now is a point" (now meaningless). Drop `nowHours` from every remaining `layoutRuler` call; keep "module without an endedAt property is a point".
- [ ] **Step 2: Run** `npx vitest run src/features/timeline/ruler-layout.test.ts` — Expected: the new null test FAILS (and tsc-level type errors for `nowHours` are fine until Step 3).
- [ ] **Step 3: Implement** the removal in `ruler-layout.ts` and `day-ruler.tsx`.
- [ ] **Step 4: Run** the same test file → PASS; `npm run lint` clean.
- [ ] **Step 5: Commit** `feat(timeline): a record without an end time is always a line`

### Task 2: `hasEnd` definitions and `endedAt` in records, CSV and sync

**Files:**
- Modify: `src/features/modules/custom/definition.ts` (type, `parseDefinition`, reserved ids)
- Modify: `src/lib/types.ts:161` (`CustomRecord`)
- Modify: `src/features/modules/custom/data.ts` (`CustomRecordInput`, `addCustomRecord`, `sheetHeaders`, `toRow`, `fromRow`, CSV `generate`)
- Modify: `src/features/modules/custom/ai-guide.ts` (ja and en "キーの一覧/Keys" and "ID の決まり/Id rules")
- Test: `definition.test.ts`, `data.test.ts`, `ai-guide.test.ts` (same folder)

**Interfaces:**
- Produces:
  - `CustomRecordDefinition.hasEnd?: boolean`
  - `CustomRecord.endedAt?: string`
  - `CustomRecordInput = Pick<CustomRecord, "date" | "recordedAt" | "values" | "note" | "endedAt">` (`endedAt` optional)
  - `export const RESERVED_FIELD_IDS = [...FIXED_COLUMNS, "endedAt"] as const;` in `definition.ts`

- [ ] **Step 1: Write failing tests.**
  - definition: `hasEnd: true is kept` (`parseDefinition({...valid, hasEnd: true}).definition.hasEnd === true`); `hasEnd other than true is dropped` (`hasEnd: "yes"` and `false` → property absent, still ok); `endedAt is a reserved field id` (field id `"endedAt"` → error `reserved_field_id` at `fields[0].id`).
  - data (sync config): `endedAt column appears for hasEnd definitions` (headers from `buildHeaders` contain `"endedAt"` right after `"recordedAt"`); `no endedAt column without hasEnd and without stored endedAt`; `endedAt column kept when a record has endedAt but the definition dropped hasEnd`; `fromRow reads endedAt` (`"2026-11-26T10:30:00+09:00"` round-trips through `toRow`/`fromRow`); `empty endedAt cell gives no property` (`"endedAt" in record === false`); `sheet without endedAt column gives no property`; `endedAt never lands in values`.
  - data (CSV): `csv has endedAt column formatted like recordedAt for hasEnd` (uses `formatTimestampForCsv`; empty cell when absent).
  - ai-guide: ja text contains `` `hasEnd` `` and lists `` `endedAt` `` in the unusable ids line; en text likewise.
- [ ] **Step 2: Run** `npx vitest run src/features/modules/custom` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `parseDefinition`: `if (input.hasEnd === true) definition.hasEnd = true;` (anything else ignored, no error). Reserved-id check uses `RESERVED_FIELD_IDS` instead of `FIXED_COLUMNS`.
  - `sheetHeaders`: insert `"endedAt"` after `"recordedAt"` when `definition.hasEnd` or any record has `endedAt`. Treat `"endedAt"` as reserved (never an unknown value column; skipped when building `values` in `fromRow`).
  - `fromRow`: set `endedAt` only when the column exists and the trimmed cell is non-empty. `toRow`: `r.endedAt ?? ""`. CSV: `r.endedAt ? formatTimestampForCsv(r.endedAt) : ""`.
  - `addCustomRecord`: copy `endedAt` only when defined.
  - ai-guide, ja, add under キーの一覧: ``- \`hasEnd\`: \`true\` にすると、記録に終了時刻を入れられるようになります（入れなくてもかまいません）。続けた時間を残したいもの（セルフケア、入浴など）向けです。省略できます。`` and add `` `endedAt` `` to 使えない項目の ID. en, under Keys: ``- \`hasEnd\`: set to \`true\` to let records carry an optional end time. Use it for things whose duration matters (self-care, a bath). Optional.`` and add `` `endedAt` `` to the unusable ids.
- [ ] **Step 4: Run** `npx vitest run src/features/modules/custom` → PASS; `npm test`; `npm run lint`; `npx tsc --noEmit` shows no errors in touched files.
- [ ] **Step 5: Commit** `feat(custom-modules): optional end time via hasEnd`

### Task 3: End input in the custom form, end time on the card

**Files:**
- Create: `src/features/modules/custom/end-time.ts` + `end-time.test.ts`
- Modify: `src/features/modules/custom/custom-form.tsx` (second `TimeField` labelled "終了 / End" when `definition.hasEnd`)
- Modify: `src/features/modules/custom/module.tsx:143-154` (`TimelineCard`)
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts` (new keys)
- Test: `custom-form.test.tsx`, `module.test.tsx`

**Interfaces:**
- Consumes: `CustomRecord.endedAt?`, `CustomRecordDefinition.hasEnd?` (Task 2); `withLocalTime`, `timeOfIso` from `@/lib/date/local-iso`; `TimeField` from `@/features/timeline/components/timeline-dialog-parts` (add an optional `label` prop if it has none; default stays the current label).
- Produces: `export function endIsoFor(startIso: string, endTime: string): string | undefined`
- i18n keys: `custom_end_time` (ja `終了`, en `End`), `custom_end_suffix` (ja `〜{time}`, en `– {time}`).

- [ ] **Step 1: Write failing tests.**
  - `end-time.test.ts`: `"" → undefined`; same as start time → `undefined`; `start "2026-11-26T09:00:00+09:00", end "09:30" → "2026-11-26T09:30:00+09:00"`; `start 23:00, end "01:15" → "2026-11-27T01:15:00+09:00"` (offset kept); month end `2026-11-30T23:00:00+09:00`, `"00:30"` → `"2026-12-01T00:30:00+09:00"`.
  - `custom-form.test.tsx`: `hasEnd form shows an empty End input`; `no End input without hasEnd`; `saving with End 09:30 stores endedAt`; `clearing End on edit removes endedAt` (saved object has no `endedAt` key); `changing start after end recomputes end` (record 09:00–09:30, change start to 10:00 → saved `endedAt` is next day 09:30).
  - `module.test.tsx`: `card shows 〜09:30 when the record has endedAt`; `card unchanged without endedAt`.
- [ ] **Step 2: Run** `npx vitest run src/features/modules/custom` → new tests FAIL.
- [ ] **Step 3: Implement.** `endIsoFor`: next-day date by calendar arithmetic on the `YYYY-MM-DD` part (e.g. `Date.UTC` + 1 day), keeping the start's offset suffix; compose with `withLocalTime`. Form: end state initialised from `record?.endedAt ? timeOfIso(record.endedAt) : ""`; on save compute `endedAt = endIsoFor(recordedAt, endTime)` and build the record without the key when undefined (`const { endedAt: _, ...rest } = record` pattern). Card: append `t("custom_end_suffix", { time: timeOfIso(record.endedAt) })` after the values line when present.
- [ ] **Step 4: Run** `npx vitest run src/features/modules/custom src/lib/date` → PASS; `npm test`; `npm run lint`.
- [ ] **Step 5: Commit** `feat(custom-modules): end time input and card display`

### Task 4: Selfcare uses an end time instead of minutes

**Files:**
- Modify: `src/features/modules/custom/builtin.ts` (selfcare definition, seed constants)
- Test: `builtin.test.ts`, `type-store.test.ts`

**Interfaces:**
- Consumes: `hasEnd` (Task 2).
- Produces: `BUILTIN_SEED_UPDATED_AT = "2000-01-02T00:00:00+00:00"`; `KNOWN_SEED_UPDATED_ATS = ["2000-01-01T00:00:00+00:00", "2000-01-02T00:00:00+00:00"]`. (Stay in year 2000 so any real user edit keeps sorting newer in sync.)

- [ ] **Step 1: Write failing tests.**
  - builtin: `selfcare has hasEnd and no minutes field` (`builtinDefinition("selfcare").hasEnd === true`, no field with id `"minutes"`, field `"item"` unchanged).
  - type-store: `an untouched old selfcare seed is replaced by the new one` (row with the old definition incl. `minutes` and `updatedAt "2000-01-01T00:00:00+00:00"` → after `ensureBuiltinTypes()` the stored definition has `hasEnd: true` and `updatedAt` is the new seed); `a user-edited selfcare definition is left alone` (row with `updatedAt "2026-11-20T10:00:00+09:00"` → unchanged).
- [ ] **Step 2: Run** `npx vitest run src/features/modules/custom` → new tests FAIL.
- [ ] **Step 3: Implement** the selfcare change (add `hasEnd: true`, remove the `minutes` field) and the seed constants. Fix any existing tests that assert the old selfcare shape or the old seed constant.
- [ ] **Step 4: Run** `npm test`, `npm run lint` → clean.
- [ ] **Step 5: Verify in the app.** `NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=lymphedema npx next dev -p 3999`, open `http://localhost:3999/ExerLog/` (isolated origin): add a selfcare record 09:00–09:30 → bar on the ruler, card shows 〜09:30; add one with no end → line; a compression record "still worn" → line.
- [ ] **Step 6: Commit** `feat(selfcare): record an end time instead of minutes`
