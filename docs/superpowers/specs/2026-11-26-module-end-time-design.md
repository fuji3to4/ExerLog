# End time for custom modules, one ruler rule — design

Date: 2026-11-26 · Size: small change (follows `2026-11-26-day-ruler-duration-design.md`)

## Intent

ExerLog is an app where people record only what they want to record. End times are a bonus that
turns a line into a bar on the day ruler, never an obligation. Forgotten end times are inevitable;
the user must never have to go back and "close" open records.

## Decisions

1. **One ruler rule for every module.** A record with an end time is a bar from start to end;
   without one it is a line at its start. Nothing runs to "now". This removes the
   `endedAt === null && nowHours` branch in `src/features/timeline/ruler-layout.ts`; compression's
   "still worn" records become lines on the ruler. The now line itself stays. Compression's form and
   its "着用中" card text are unchanged.
2. **Custom modules opt in with `hasEnd`.** `CustomRecordDefinition` gains optional
   `hasEnd?: boolean`. Only modules with `hasEnd: true` show an optional "終了 / End" time input next to
   the start time in their form. Other modules' forms do not change.
3. **Stored as `endedAt`.** `CustomRecord` gains `endedAt?: string` (local ISO, same format as
   `recordedAt`); absent when the input is empty. Clearing the input removes it.
4. **Input is a time only**, like the start. An end earlier than the start means the next day
   (crosses midnight); no error. Equal to start → treated as no end (line).
5. **CSV and sync** carry an `endedAt` column for `hasEnd` modules (empty cell = absent).
   `endedAt` becomes a reserved field id for every definition (parse error `reserved_field_id`).
6. **AI definition guide** (`ai-guide.ts`, ja and en) documents `hasEnd` and lists `endedAt` among the
   ids you cannot use.
7. **Timeline card** of a `hasEnd` record with an end shows the end time after the values
   (e.g. "〜09:30"); without an end, unchanged.
8. **Built-in selfcare** gets `hasEnd: true` and loses its `minutes` ("時間 / Duration") field.
   No migration of existing `minutes` values: current data is from test versions and may be ignored.
   Installs holding the old untouched seed must pick up the new definition (see
   `BUILTIN_SEED_UPDATED_AT` / `KNOWN_SEED_UPDATED_ATS` in `builtin.ts`).

## Approaches considered

- **A. Definition flag `hasEnd` (picked)** — only modules that want it get the input; generic.
- B. End input on every custom module — less work, but clutters forms (weight, wellness) with a
  meaningless field.
- C. An "end time" field type — rejected: an end time belongs to the record, not to the values, and
  would need a one-per-definition rule.
- Linking a duration field to the end time (fill one, compute the other) — rejected: needs a field
  role, two-way form sync and a conflict rule. Selfcare drops `minutes` instead.

## Non-goals / anti-goals

- No "ongoing" state, no reminders, no warnings about missing end times.
- No date picker for the end (time only).
- No migration of old selfcare `minutes` values.

## Left to the builder

- Exact placement/styling of the end input (reuse the existing `TimeField`).
- How the seed-version bump is done so untouched selfcare definitions update and user-edited ones
  are left alone.
- Whether summary/history views show durations (not required).
