# Day ruler: show durations — design

Date: 2026-11-26 · Size: small change

## Intent

The day ruler above the timeline should answer "how long was it worn?" and "how long did I exercise?"
at a glance, by drawing records with a length as bars of that length. Today only exercises get a
width (from `durationSeconds`), and a 3.5 % minimum width makes close records stack into extra rows,
so the ruler grows tall without showing durations well.

## Goals

- Records with a length are drawn as bars of their true length.
- The ruler stays short: rows only grow when *different* modules overlap.
- Generic: any module can opt into durations; no compression-specific branch in the ruler.

## Non-goals / anti-goals

- Making end times mandatory. Records without an end stay points (no nagging, logging stays loose).
- Adding end-time fields to other modules' forms (separate topic).

## Approaches considered

- **A. Drop the minimum width, stack on real overlap only** — closest to today, generic.
- **B. One fixed row per kind, overlaps drawn translucent** — fixed height, but bars of different
  modules become hard to tell apart.
- **C. Fixed rows by meaning (worn / exercise / point records)** — readable, but hard-codes
  categories; rejected as not generic.
- **Picked: A with B's overlap rule inside a group.** Same-group overlaps share a row and darken;
  different-group overlaps drop to a new row.

## Design (as decided)

1. **Generic end time.** Add optional `endedAt?: string | null` to `ModuleRecord`
   (`src/features/modules/types.ts`). Compression already has it; other modules may add it later.
2. **Length of a clip.**
   - exercise: `log.durationSeconds` (unchanged)
   - module: until `endedAt` when set; when `null`, extends to "now" on today, a point on past days
   - watch, and records without an end: a thin vertical line (a few px, fixed in CSS, not a share of the day)
3. **No minimum width.** Remove `MIN_CLIP_SHARE`; overlap is decided on real time only.
4. **Rows.** Lanes per kind stay (`module`, `exercise`, `watch`). Within a lane, each clip has a group:
   - module → its `moduleId`
   - all exercises → one group
   - all watches → one group

   A clip goes into the first row where it overlaps nothing of a *different* group. Clips of the same
   group may overlap in one row; they are drawn semi-transparent so overlaps darken.
   Consequence (accepted): a point record from another module taken while compression is worn drops
   to the row below.

## Left to the builder

- Exact line width and clip opacity (keep within the existing ruler styling in `globals.css`).
- Whether `nowHours` is threaded into placement for open-ended module records (it already reaches
  `DayRuler` for today only).
- Tests for the placement function (group sharing, different-group stacking, open-ended records,
  zero-length points).
