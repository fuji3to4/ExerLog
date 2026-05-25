# Timezone Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store `loggedAt`/`updatedAt` with local timezone offset, display them as `HH:MM` in the history page, and export them as `YYYY-MM-DD HH:MM` in CSV.

**Architecture:** Two new utility files handle timestamp generation (`localIsoNow()`) and display formatting (`formatTime()`, `formatTimestampForCsv()`). Three write sites are updated to use `localIsoNow()`. The history query adds `updatedAt` to its summary type, and `DaySummary` renders the new times. The CSV generators use the new formatter. No changes to LanguageProvider or i18n.

**Tech Stack:** TypeScript, React 19, Dexie.js (IndexedDB), Vitest + Testing Library, jsdom test environment

---

## File Map

| File | Status | Role |
|------|--------|------|
| `src/lib/date/local-iso.ts` | **Create** | `localIsoNow()` — generates `2024-03-30T14:32:00+09:00` |
| `src/lib/date/local-iso.test.ts` | **Create** | Unit tests for `localIsoNow()` |
| `src/lib/date/format-timestamp.ts` | **Create** | `formatTime()` and `formatTimestampForCsv()` |
| `src/lib/date/format-timestamp.test.ts` | **Create** | Unit tests for formatting utilities |
| `src/features/storage/exercise-logs.repository.ts` | **Modify** | Line 20: `new Date().toISOString()` → `localIsoNow()` |
| `src/features/storage/daily-condition.repository.ts` | **Modify** | Line 17: `new Date().toISOString()` → `localIsoNow()` |
| `src/features/history/components/day-summary.tsx` | **Modify** | Line 232: `new Date().toISOString()` → `localIsoNow()`; render times in UI |
| `src/features/history/history-query.ts` | **Modify** | Add `updatedAt: string \| null` to `HistoryDaySummary`; map from condition |
| `src/features/settings/csv/history-csv.ts` | **Modify** | Use `formatTimestampForCsv()` for `loggedAt` and `updatedAt` |
| `src/features/settings/csv/history-csv.test.ts` | **Create** | Tests asserting `YYYY-MM-DD HH:MM` format in CSV output |
| `src/features/storage/storage.test.ts` | **Modify** | Add assertions that saved `loggedAt`/`updatedAt` use offset format |

---

## Task 1: `localIsoNow()` — timestamp generator with offset

**Files:**
- Create: `src/lib/date/local-iso.ts`
- Create: `src/lib/date/local-iso.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `src/lib/date/local-iso.test.ts`:

  ```typescript
  import { localIsoNow } from "./local-iso";

  test("returns a string matching ISO 8601 with UTC offset", () => {
    const result = localIsoNow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  test("offset matches the current environment timezone offset", () => {
    const before = new Date();
    const result = localIsoNow();
    const after = new Date();

    const offsetMinutes = -before.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const h = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const m = String(absMinutes % 60).padStart(2, "0");
    const expectedOffset = `${sign}${h}:${m}`;

    expect(result.endsWith(expectedOffset)).toBe(true);

    // datetime part is between before and after (within 1 second tolerance)
    const isoUtcEquivalent = result.replace(/([+-]\d{2}:\d{2})$/, "Z");
    const parsed = new Date(
      isoUtcEquivalent.replace(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
        (_match, dt) => {
          const [datePart, timePart] = dt.split("T");
          return `${datePart}T${timePart}`;
        }
      )
    );
    // The local time string represents the wall clock, not UTC.
    // Just verify the parsed UTC instant is plausible (within 24h window).
    const diffMs = Math.abs(parsed.getTime() - before.getTime() - (-before.getTimezoneOffset() * 60_000));
    expect(diffMs).toBeLessThan(5_000);
  });

  test("not equal to new Date().toISOString() in non-UTC environments (or same if UTC)", () => {
    const result = localIsoNow();
    // The format itself must never end in 'Z'
    expect(result.endsWith("Z")).toBe(false);
  });
  ```

- [ ] **Step 2: Run to verify it fails**

  ```
  npx vitest run src/lib/date/local-iso.test.ts
  ```
  Expected: FAIL — "Cannot find module './local-iso'"

- [ ] **Step 3: Implement `localIsoNow()`**

  Create `src/lib/date/local-iso.ts`:

  ```typescript
  /**
   * Returns the current local time as an ISO 8601 string with UTC offset.
   * Example: "2024-03-30T14:32:00+09:00"
   *
   * Unlike new Date().toISOString() which always returns UTC ("Z"),
   * this captures the local wall-clock time and offset, making stored
   * timestamps self-describing.
   */
  export function localIsoNow(): string {
    const now = new Date();
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const h = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const m = String(absMinutes % 60).padStart(2, "0");
    // Shift the UTC instant by the offset so that toISOString() yields local time digits
    const local = new Date(now.getTime() + offsetMinutes * 60_000);
    return `${local.toISOString().slice(0, 19)}${sign}${h}:${m}`;
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```
  npx vitest run src/lib/date/local-iso.test.ts
  ```
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```
  git add src/lib/date/local-iso.ts src/lib/date/local-iso.test.ts
  git commit -m "feat: add localIsoNow() for offset-aware timestamp generation

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 2: `formatTime()` and `formatTimestampForCsv()` — display formatters

**Files:**
- Create: `src/lib/date/format-timestamp.ts`
- Create: `src/lib/date/format-timestamp.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `src/lib/date/format-timestamp.test.ts`:

  ```typescript
  import { formatTime, formatTimestampForCsv } from "./format-timestamp";

  // Edge cases — always TZ-agnostic
  describe("formatTime", () => {
    test("returns empty string for empty input", () => {
      expect(formatTime("")).toBe("");
    });

    test("returns empty string for invalid ISO string", () => {
      expect(formatTime("not-a-date")).toBe("");
    });

    test("returns HH:MM shaped string for a valid offset ISO string", () => {
      const result = formatTime("2024-03-30T14:32:00+09:00");
      // Format varies by locale (12h or 24h) but always has digits and a colon
      expect(result).toMatch(/\d+:\d{2}/);
    });

    test("returns HH:MM shaped string for a legacy UTC string", () => {
      const result = formatTime("2024-03-30T05:32:00.000Z");
      expect(result).toMatch(/\d+:\d{2}/);
    });
  });

  describe("formatTimestampForCsv", () => {
    test("returns empty string for empty input", () => {
      expect(formatTimestampForCsv("")).toBe("");
    });

    test("returns empty string for invalid ISO string", () => {
      expect(formatTimestampForCsv("not-a-date")).toBe("");
    });

    test("returns YYYY-MM-DD HH:MM shaped string for a valid offset ISO string", () => {
      const result = formatTimestampForCsv("2024-03-30T14:32:00+09:00");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    test("returns YYYY-MM-DD HH:MM shaped string for a legacy UTC string", () => {
      const result = formatTimestampForCsv("2024-03-30T05:32:00.000Z");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });
  ```

- [ ] **Step 2: Run to verify they fail**

  ```
  npx vitest run src/lib/date/format-timestamp.test.ts
  ```
  Expected: FAIL — "Cannot find module './format-timestamp'"

- [ ] **Step 3: Implement the formatters**

  Create `src/lib/date/format-timestamp.ts`:

  ```typescript
  /**
   * Formats an ISO 8601 timestamp string (offset or UTC "Z") as "HH:MM"
   * using the browser's local timezone and locale.
   * Returns "" for empty or invalid input.
   */
  export function formatTime(isoString: string): string {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  /**
   * Formats an ISO 8601 timestamp string (offset or UTC "Z") as "YYYY-MM-DD HH:MM"
   * using the browser's local timezone in 24-hour format.
   * Returns "" for empty or invalid input.
   */
  export function formatTimestampForCsv(isoString: string): string {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const date = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d); // "2024-03-30"
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d); // "14:32" (24h, en-GB)
    return `${date} ${time}`;
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```
  npx vitest run src/lib/date/format-timestamp.test.ts
  ```
  Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

  ```
  git add src/lib/date/format-timestamp.ts src/lib/date/format-timestamp.test.ts
  git commit -m "feat: add formatTime and formatTimestampForCsv utilities

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 3: Update timestamp write sites to use `localIsoNow()`

**Files:**
- Modify: `src/features/storage/exercise-logs.repository.ts` (line 20)
- Modify: `src/features/storage/daily-condition.repository.ts` (line 17)
- Modify: `src/features/history/components/day-summary.tsx` (line 232)
- Modify: `src/features/storage/storage.test.ts`

- [ ] **Step 1: Add assertion to existing storage tests**

  In `src/features/storage/storage.test.ts`, add to the existing "upserts one daily condition per day" test after `expect(entry?.note).toBe("legs feel heavy");`:

  ```typescript
  expect(entry?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  ```

  And add to the "stores one log result per exercise and day" test after `expect(logs[0]?.result).toBe("did");`:

  ```typescript
  expect(logs[0]?.loggedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  ```

- [ ] **Step 2: Run to verify the new assertions fail**

  ```
  npx vitest run src/features/storage/storage.test.ts
  ```
  Expected: 2 tests FAIL (format mismatch — still UTC "Z" format)

- [ ] **Step 3: Update `exercise-logs.repository.ts`**

  Add import at top of `src/features/storage/exercise-logs.repository.ts`:
  ```typescript
  import { localIsoNow } from "@/lib/date/local-iso";
  ```

  Change line 20:
  ```typescript
  // Before:
  loggedAt: new Date().toISOString(),
  // After:
  loggedAt: localIsoNow(),
  ```

- [ ] **Step 4: Update `daily-condition.repository.ts`**

  Add import at top of `src/features/storage/daily-condition.repository.ts`:
  ```typescript
  import { localIsoNow } from "@/lib/date/local-iso";
  ```

  Change line 17:
  ```typescript
  // Before:
  updatedAt: new Date().toISOString(),
  // After:
  updatedAt: localIsoNow(),
  ```

- [ ] **Step 5: Update `day-summary.tsx` — the condition edit save handler**

  Add import at top of `src/features/history/components/day-summary.tsx` (after existing imports):
  ```typescript
  import { localIsoNow } from "@/lib/date/local-iso";
  ```

  Change line 232 inside `handleSaveCondition`:
  ```typescript
  // Before:
  updatedAt: new Date().toISOString(),
  // After:
  updatedAt: localIsoNow(),
  ```

- [ ] **Step 6: Run storage tests to verify they pass**

  ```
  npx vitest run src/features/storage/storage.test.ts
  ```
  Expected: PASS (all 3 tests + 2 new assertions)

- [ ] **Step 7: Commit**

  ```
  git add src/features/storage/exercise-logs.repository.ts \
          src/features/storage/daily-condition.repository.ts \
          src/features/history/components/day-summary.tsx \
          src/features/storage/storage.test.ts
  git commit -m "feat: store loggedAt and updatedAt with local timezone offset

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 4: Add `updatedAt` to `HistoryDaySummary`

**Files:**
- Modify: `src/features/history/history-query.ts`

- [ ] **Step 1: Update the type and query**

  In `src/features/history/history-query.ts`:

  Change `HistoryDaySummary` type (line 14–18):
  ```typescript
  // Before:
  export type HistoryDaySummary = {
    logs: HistoryDayLog[];
    conditionLevel: "good" | "okay" | "tired" | null;
    note: string;
  };

  // After:
  export type HistoryDaySummary = {
    logs: HistoryDayLog[];
    conditionLevel: "good" | "okay" | "tired" | null;
    note: string;
    updatedAt: string | null;
  };
  ```

  Change the return value of `getHistoryDaySummary` (line 43–45):
  ```typescript
  // Before:
    conditionLevel: condition?.conditionLevel ?? null,
    note: condition?.note ?? "",

  // After:
    conditionLevel: condition?.conditionLevel ?? null,
    note: condition?.note ?? "",
    updatedAt: condition?.updatedAt ?? null,
  ```

- [ ] **Step 2: Run the full test suite to verify no regressions**

  ```
  npx vitest run
  ```
  Expected: PASS (all existing tests)

- [ ] **Step 3: Commit**

  ```
  git add src/features/history/history-query.ts
  git commit -m "feat: expose updatedAt in HistoryDaySummary

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 5: Display timestamps in `DaySummary`

**Files:**
- Modify: `src/features/history/components/day-summary.tsx`

- [ ] **Step 1: Add `formatTime` import**

  At the top of `src/features/history/components/day-summary.tsx`, add:
  ```typescript
  import { formatTime } from "@/lib/date/format-timestamp";
  ```
  (`localIsoNow` import was already added in Task 3.)

- [ ] **Step 2: Render `loggedAt` time on each log item**

  Locate the exercise log list item JSX (around line 258–261):
  ```tsx
  // Before:
  <li key={log.exerciseId} className="day-summary__item">
    <span>{log.title}</span>
    <span className="day-summary__result">{formatResult(log.result)}</span>

  // After:
  <li key={log.exerciseId} className="day-summary__item">
    <span>{log.title}</span>
    <span className="day-summary__result">{formatResult(log.result)}</span>
    {formatTime(log.loggedAt) && (
      <span className="day-summary__time">{formatTime(log.loggedAt)}</span>
    )}
  ```

- [ ] **Step 3: Render `updatedAt` time on the condition section**

  Locate the condition display (around line 294–295):
  ```tsx
  // Before:
  <p>{formatCondition(summary.conditionLevel)}</p>
  {summary.note ? <p>{summary.note}</p> : null}

  // After:
  <p>{formatCondition(summary.conditionLevel)}</p>
  {summary.note ? <p>{summary.note}</p> : null}
  {summary.updatedAt && formatTime(summary.updatedAt) && (
    <p className="day-summary__time">{formatTime(summary.updatedAt)}</p>
  )}
  ```

- [ ] **Step 4: Run the full test suite**

  ```
  npx vitest run
  ```
  Expected: PASS

- [ ] **Step 5: Add a component test for DaySummary timestamp rendering**

  Create `src/features/history/components/day-summary.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { DaySummary } from "./day-summary";
  import type { HistoryDaySummary } from "../history-query";

  const summary: HistoryDaySummary = {
    logs: [
      {
        id: "1",
        exerciseId: "squat-1",
        title: "Squat",
        result: "did",
        loggedAt: "2024-03-30T14:32:00+09:00",
      },
    ],
    conditionLevel: "good",
    note: "",
    updatedAt: "2024-03-30T09:15:00+09:00",
  };

  test("renders loggedAt time for each exercise log entry", () => {
    render(<DaySummary selectedDate="2024-03-30" summary={summary} />);
    // formatTime output varies by locale but will contain digits and ":"
    const timeEls = document.querySelectorAll(".day-summary__time");
    expect(timeEls.length).toBeGreaterThanOrEqual(1);
  });

  test("renders updatedAt time for the condition entry", () => {
    render(<DaySummary selectedDate="2024-03-30" summary={summary} />);
    const timeEls = document.querySelectorAll(".day-summary__time");
    // At least one for loggedAt, one for updatedAt
    expect(timeEls.length).toBeGreaterThanOrEqual(2);
  });

  test("does not render time element when loggedAt is empty", () => {
    const summaryNoTime: HistoryDaySummary = {
      ...summary,
      logs: [{ ...summary.logs[0]!, loggedAt: "" }],
      updatedAt: null,
    };
    render(<DaySummary selectedDate="2024-03-30" summary={summaryNoTime} />);
    expect(document.querySelectorAll(".day-summary__time").length).toBe(0);
  });
  ```

  Run:
  ```
  npx vitest run src/features/history/components/day-summary.test.tsx
  ```
  Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

  ```
  git add src/features/history/components/day-summary.tsx \
          src/features/history/components/day-summary.test.tsx
  git commit -m "feat: display loggedAt and updatedAt times in history day summary

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 6: CSV export — format timestamps

**Files:**
- Modify: `src/features/settings/csv/history-csv.ts`
- Create: `src/features/settings/csv/history-csv.test.ts`

- [ ] **Step 1: Write failing CSV tests**

  Create `src/features/settings/csv/history-csv.test.ts`:

  ```typescript
  import { generateExerciseLogsCsv, generateConditionsCsv } from "./history-csv";
  import type { ExerciseLog, DailyConditionEntry } from "@/lib/types";

  const sampleLog: ExerciseLog = {
    id: "1",
    date: "2024-03-30",
    exerciseId: "squat-1",
    result: "did",
    loggedAt: "2024-03-30T14:32:00+09:00",
  };

  const sampleCondition: DailyConditionEntry = {
    date: "2024-03-30",
    conditionLevel: "good",
    note: "felt great",
    updatedAt: "2024-03-30T09:15:00+09:00",
  };

  test("exercise logs CSV loggedAt column uses YYYY-MM-DD HH:MM format", () => {
    const titleMap = new Map([["squat-1", "Squat"]]);
    const csv = generateExerciseLogsCsv([sampleLog], titleMap);
    const rows = csv.split("\n");
    expect(rows[0]).toBe("date,exerciseId,exerciseTitle,result,loggedAt");
    const dataRow = rows[1] ?? "";
    const lastColumn = dataRow.split(",").at(-1) ?? "";
    expect(lastColumn).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test("conditions CSV updatedAt column uses YYYY-MM-DD HH:MM format", () => {
    const csv = generateConditionsCsv([sampleCondition]);
    const rows = csv.split("\n");
    expect(rows[0]).toBe("date,conditionLevel,note,updatedAt");
    const dataRow = rows[1] ?? "";
    const lastColumn = dataRow.split(",").at(-1) ?? "";
    expect(lastColumn).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test("exercise logs CSV with empty loggedAt outputs empty string in that column", () => {
    const logWithoutTimestamp: ExerciseLog = { ...sampleLog, loggedAt: "" };
    const csv = generateExerciseLogsCsv([logWithoutTimestamp], new Map([["squat-1", "Squat"]]));
    const lastColumn = csv.split("\n")[1]?.split(",").at(-1) ?? "x";
    expect(lastColumn).toBe("");
  });
  ```

- [ ] **Step 2: Run to verify they fail**

  ```
  npx vitest run src/features/settings/csv/history-csv.test.ts
  ```
  Expected: FAIL — tests find raw ISO strings (`2024-03-30T14:32:00+09:00`), not formatted

- [ ] **Step 3: Update `history-csv.ts`**

  In `src/features/settings/csv/history-csv.ts`, add import at the top:
  ```typescript
  import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
  ```

  Change the `loggedAt` field in `generateExerciseLogsCsv` (line 16):
  ```typescript
  // Before:
  [log.date, log.exerciseId, exerciseTitleMap.get(log.exerciseId) ?? log.exerciseId, log.result, log.loggedAt]

  // After:
  [log.date, log.exerciseId, exerciseTitleMap.get(log.exerciseId) ?? log.exerciseId, log.result, formatTimestampForCsv(log.loggedAt)]
  ```

  Change the `updatedAt` field in `generateConditionsCsv` (line 28):
  ```typescript
  // Before:
  [c.date, c.conditionLevel, c.note, c.updatedAt]

  // After:
  [c.date, c.conditionLevel, c.note, formatTimestampForCsv(c.updatedAt)]
  ```

- [ ] **Step 4: Run CSV tests to verify they pass**

  ```
  npx vitest run src/features/settings/csv/history-csv.test.ts
  ```
  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```
  git add src/features/settings/csv/history-csv.ts src/features/settings/csv/history-csv.test.ts
  git commit -m "feat: format loggedAt and updatedAt as YYYY-MM-DD HH:MM in CSV export

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

---

## Task 7: Final verification

- [ ] **Step 1: Run the full test suite**

  ```
  npm run test
  ```
  Expected: All tests pass

- [ ] **Step 2: Run lint**

  ```
  npm run lint
  ```
  Expected: No errors (pre-existing `no-img` warnings are OK)

- [ ] **Step 3: Run build**

  ```
  npm run build
  ```
  Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit if any fixes were needed**

  If the lint or build step required fixes, commit them:
  ```
  git add -A
  git commit -m "fix: address lint/build issues from timezone integration

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```
