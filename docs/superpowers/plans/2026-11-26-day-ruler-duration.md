# Day Ruler Durations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The day ruler draws records with a length as bars of their true length (exercise duration, module `endedAt`), points as thin lines, and only stacks rows when different groups overlap.

**Architecture:** Move clip placement out of `day-ruler.tsx` into a pure, tested `ruler-layout.ts`. `ModuleRecord` gains an optional `endedAt`, so any module opts in by storing it. `DayRuler` renders what the layout returns; CSS makes points thin lines and bands translucent so same-group overlaps darken.

**Tech Stack:** Next.js (static export), React, TypeScript, Vitest 3.0.8, plain CSS in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-11-26-day-ruler-duration-design.md`

## Global Constraints

- End times stay optional; a record without one is a point. No new required inputs, no warnings.
- No compression-specific code in the ruler — it reads only `ModuleRecord.endedAt`.
- No minimum width as a share of the day (`MIN_CLIP_SHARE` is removed).
- Lanes stay per kind in the order `module`, `exercise`, `watch`.
- Groups: module → `module:<moduleId>`; all exercises → `exercise`; all watches → `watch`.
- The ruler stays `aria-hidden`; the list below is the accessible view.

## Review Focus

1. Worn overnight: `endedAt` on the next day → bar runs to the end of the ruler, never negative or wrapped. (Test in Task 1.)
2. `endedAt` earlier than `recordedAt` (bad data/import) → drawn as a point, no negative width. (Test in Task 1.)
3. Open-ended record on a past day (`nowHours` undefined) → point; on today but started after "now" (clock skew) → point. (Tests in Task 1.)
4. Two point records of different modules at the same minute → stacked, not drawn on top of each other. (Test in Task 1.)
5. Very short exercise (e.g. 60 s) → still visible on screen (CSS min-width equals the point width). (Checked in Task 2.)

---

### Task 1: Pure ruler layout with durations and group-aware rows

**Files:**
- Create: `src/features/timeline/ruler-layout.ts`
- Create: `src/features/timeline/ruler-layout.test.ts`
- Modify: `src/features/modules/types.ts:16` (add `endedAt?: string | null` to `ModuleRecord`, with a one-line doc comment: "When set, the record spans recordedAt → endedAt; null while still ongoing.")

**Interfaces:**
- Produces:
  ```ts
  export type RulerClip = {
    item: TimelineItem;
    /** Share of the span (0–1) from the ruler start. */
    x: number;
    /** Share of the span; 0 for a point. Already clipped so x + width <= 1. */
    width: number;
    row: number;
    isPoint: boolean;
  };
  export function rulerGroupOf(item: TimelineItem): string;
  export function layoutRuler(
    items: TimelineItem[],
    opts: { start: number; span: number; nowHours?: number },
  ): { clips: RulerClip[]; rows: number };
  ```
  Also move `hoursOf(iso: string): number` here and export it (DayRuler still needs it for the start hour).

- [ ] **Step 1: Write the failing tests** in `ruler-layout.test.ts`. Build items with helpers like those in `build-timeline.test.ts` (`D = "2026-10-20"`, `iso("08:00") = "2026-10-20T08:00:00+09:00"`); module items use `{ kind: "module", moduleId, id, at, record: { id, date: D, recordedAt: at, endedAt }, label: null }`. Use `start: 6, span: 18` unless noted.
  - `exercise width comes from durationSeconds`: exercise at 09:00, 1800 s → `x ≈ 3/18`, `width ≈ 0.5/18`, `isPoint false`.
  - `module with endedAt is a band`: compression 08:00→18:00 → `width ≈ 10/18`.
  - `open-ended module runs to now on today`: 08:00, `endedAt: null`, `nowHours: 12` → `width ≈ 4/18`.
  - `open-ended module is a point on a past day`: same, no `nowHours` → `width 0`, `isPoint true`.
  - `open-ended module started after now is a point`: 13:00, `nowHours: 12` → `isPoint true`.
  - `endedAt before recordedAt is a point`.
  - `endedAt on the next day is clipped to the ruler end`: 20:00 → `2026-10-21T07:00:00+09:00` → `x + width === 1`.
  - `watch is a point`.
  - `same group overlap shares a row`: two compression bands 08:00–12:00 and 10:00–14:00 → both `row 0`, `rows === 1`.
  - `different module inside a band drops a row`: compression 08:00–18:00 + wellness point 10:00 → wellness `row 1`.
  - `exercises never stack`: two overlapping exercises → same row.
  - `different-module points at the same minute stack`: wellness 10:00 + measurement 10:00 → rows 0 and 1.
  - `points close together do not stack`: wellness 10:00 + measurement 10:05 → both `row 0`.
  - `lanes keep kind order`: one module, one exercise, one watch, none overlapping → rows 0, 1, 2; `rows === 3`.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run src/features/timeline/ruler-layout.test.ts`
  Expected: FAIL (module `./ruler-layout` not found).

- [ ] **Step 3: Implement `ruler-layout.ts`**

  Length in hours: exercise → `durationSeconds / 3600`; module with `endedAt` → `(Date.parse(endedAt) - Date.parse(at)) / 3_600_000`; module with `endedAt === null` (ongoing) → `nowHours - hoursOf(at)` when `nowHours` is defined, else 0; module with `endedAt` absent (undefined) → 0 (point); watch → 0. A length `<= 0` makes a point. Clip `width` to `1 - x`.

  Rows: per lane (kind order), each row keeps its placed intervals with their group. A clip goes into the first row where no clip of a *different* group overlaps it; otherwise a new row. Overlap test:
  ```ts
  // bands: strict (touching ends do not overlap); with any point involved: inclusive
  const overlaps = (a, b) =>
    a.isPoint || b.isPoint ? a.from <= b.to && b.from <= a.to : a.from < b.to && b.from < a.to;
  ```
  (`from`/`to` in hours. Inclusive-for-points is what makes same-minute points of different modules stack while 10:00 and 10:05 do not.)

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run src/features/timeline/ruler-layout.test.ts`
  Expected: PASS. Then `npx tsc --noEmit` passes (the new optional field must not break any module record type).

- [ ] **Step 5: Commit**

  ```bash
  git add src/features/timeline/ruler-layout.ts src/features/timeline/ruler-layout.test.ts src/features/modules/types.ts
  git commit -m "feat(timeline): lay out ruler clips by real duration and group"
  ```

### Task 2: Render the layout in DayRuler and style points/bands

**Files:**
- Modify: `src/features/timeline/components/day-ruler.tsx` (delete `place`, `MIN_CLIP_SHARE`, local `hoursOf`, `LANE_ORDER`; call `layoutRuler(items, { start, span, nowHours })`)
- Modify: `src/app/globals.css:486-507` (`.day-ruler__clip`)

**Interfaces:**
- Consumes: `layoutRuler`, `hoursOf`, `RulerClip` from `../ruler-layout`.
- `DayRulerProps` is unchanged, so `day-timeline.tsx` needs no edits.

- [ ] **Step 1: Wire DayRuler.** Map `clips` to spans as today, passing `--x`, `--w`, `--row`, `--c`; add class `is-point` when `clip.isPoint`. Keep `is-new` for `highlightId`. Track `--rows` stays `Math.max(rows, 2)`.

- [ ] **Step 2: Update CSS.**
  - `.day-ruler__clip`: background becomes translucent so overlaps darken — e.g. `color-mix(in oklab, var(--c) 35%, transparent)` with the existing inset outline; replace `min-width: 14px` with `min-width: 3px`.
  - `.day-ruler__clip.is-point`: `width: 3px; margin-left: -1.5px; border-radius: 2px;` and a solid `var(--c)` fill so lines read clearly.
  - Keep the dark-mode tokens working (colors come from `--c` and existing tokens only).

- [ ] **Step 3: Verify.**
  - Run: `npm test` → all pass.
  - Run: `npx tsc --noEmit` and `npm run lint` → clean.
  - Launch the app (`/run` or `npm run dev`) on Today with: a compression record 08:00→now, a wellness record during it, two overlapping exercises, one 60 s exercise. Expected: compression is a long band; wellness is a line on the row below; the exercises share one row with a darker overlap; the 60 s exercise is visible; past days show open-ended compression as a line.

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/timeline/components/day-ruler.tsx src/app/globals.css
  git commit -m "feat(timeline): draw durations on the day ruler"
  ```
