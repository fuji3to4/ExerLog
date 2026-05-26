# Daily Wellness and Metrics Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace condition CSV export with daily wellness export and add daily metrics CSV export (height/weight/bodyFat).

**Architecture:** Keep the change localized to Settings data-management and CSV generator utilities. Replace the old `generateConditionsCsv` path with `generateDailyWellnessCsv`, add `generateDailyMetricsCsv`, and wire two explicit export buttons in settings. Preserve existing exercise/log export behavior and formatting helpers.

**Tech Stack:** Next.js 15, React 19, TypeScript, Dexie, Vitest

---

## File Structure (before tasks)

- **Modify:** `src/features/settings/csv/history-csv.ts`  
  Add CSV generators for `dailyWellness` and `dailyMetrics`, keeping escape/timestamp behavior aligned with existing exports.
- **Modify:** `src/features/settings/csv/history-csv.test.ts`  
  Replace old condition-export tests with daily-wellness tests and add daily-metrics tests.
- **Modify:** `src/features/settings/components/data-management.tsx`  
  Replace old condition export handler/button with daily-wellness export and add daily-metrics export button/handler.
- **Modify:** `src/features/i18n/messages/ja.ts`  
  Update wellness export label and add metrics export label.
- **Modify:** `src/features/i18n/messages/en.ts`  
  Update wellness export label and add metrics export label.

---

### Task 1: Add CSV generators for daily wellness and daily metrics

**Files:**
- Modify: `src/features/settings/csv/history-csv.ts`
- Modify: `src/features/settings/csv/history-csv.test.ts`

- [ ] **Step 1: Write failing tests for daily wellness + daily metrics CSV**

```ts
import { describe, it, expect } from "vitest";
import {
  generateExerciseLogsCsv,
  generateDailyWellnessCsv,
  generateDailyMetricsCsv,
} from "./history-csv";
import type { ExerciseLog, DailyWellnessEntry, DailyMetricEntry } from "@/lib/types";

const makeWellness = (overrides: Partial<DailyWellnessEntry> = {}): DailyWellnessEntry => ({
  date: "2024-01-15",
  physicalScore: 4,
  mentalScore: 3,
  note: "slept well",
  updatedAt: "2024-01-15T09:30:00+09:00",
  ...overrides,
});

const makeMetric = (overrides: Partial<DailyMetricEntry> = {}): DailyMetricEntry => ({
  id: "m1",
  date: "2024-01-15",
  metricType: "weight",
  value: 62.4,
  unit: "kg",
  recordedAt: "2024-01-15T07:10:00+09:00",
  ...overrides,
});

describe("generateDailyWellnessCsv", () => {
  it("outputs daily wellness headers and formatted timestamp", () => {
    const csv = generateDailyWellnessCsv([makeWellness()]);
    expect(csv.split("\n")[0]).toBe("date,physicalScore,mentalScore,note,updatedAt");
    expect(csv).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });
});

describe("generateDailyMetricsCsv", () => {
  it("outputs metric headers including metricType/value/unit", () => {
    const csv = generateDailyMetricsCsv([makeMetric()]);
    expect(csv.split("\n")[0]).toBe("date,metricType,value,unit,recordedAt");
    expect(csv).toContain("weight");
    expect(csv).toContain("62.4");
    expect(csv).toContain("kg");
  });

  it("handles empty recordedAt gracefully", () => {
    const csv = generateDailyMetricsCsv([makeMetric({ recordedAt: "" })]);
    expect(csv).toContain("weight");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/settings/csv/history-csv.test.ts`  
Expected: FAIL with missing exports/functions (`generateDailyWellnessCsv` and `generateDailyMetricsCsv`).

- [ ] **Step 3: Implement minimal CSV generators**

```ts
import type { DailyMetricEntry, DailyWellnessEntry, ExerciseLog } from "@/lib/types";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";

export function generateDailyWellnessCsv(entries: DailyWellnessEntry[]): string {
  const headers = ["date", "physicalScore", "mentalScore", "note", "updatedAt"];
  const rows = [
    headers.join(","),
    ...entries.map((entry) =>
      [
        entry.date,
        entry.physicalScore,
        entry.mentalScore,
        entry.note,
        formatTimestampForCsv(entry.updatedAt),
      ]
        .map(escapeCsvField)
        .join(","),
    ),
  ];
  return rows.join("\n");
}

export function generateDailyMetricsCsv(entries: DailyMetricEntry[]): string {
  const headers = ["date", "metricType", "value", "unit", "recordedAt"];
  const rows = [
    headers.join(","),
    ...entries.map((entry) =>
      [
        entry.date,
        entry.metricType,
        entry.value,
        entry.unit,
        formatTimestampForCsv(entry.recordedAt),
      ]
        .map(escapeCsvField)
        .join(","),
    ),
  ];
  return rows.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/settings/csv/history-csv.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/csv/history-csv.ts src/features/settings/csv/history-csv.test.ts
git commit -m "feat: add daily wellness and metrics csv generators"
```

---

### Task 2: Wire settings export actions to daily wellness and daily metrics

**Files:**
- Modify: `src/features/settings/components/data-management.tsx`

- [ ] **Step 1: Write failing UI test expectations for new export labels/actions**

```tsx
it("renders wellness and metrics export buttons in history section", () => {
  renderWithLanguage(<DataManagement />, { initialLanguage: "en" });
  expect(screen.getByRole("button", { name: "Export daily wellness records (CSV)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export body metrics records (CSV)" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/settings/components/settings-screen.test.tsx`  
Expected: FAIL because old condition export text/button is still used and metrics export button does not exist.

- [ ] **Step 3: Implement handlers and button wiring**

```tsx
import {
  generateDailyMetricsCsv,
  generateDailyWellnessCsv,
  generateExerciseLogsCsv,
} from "../csv/history-csv";

async function handleExportDailyWellness() {
  const entries = await appDb.dailyWellness.toArray();
  downloadCsv("daily-wellness.csv", generateDailyWellnessCsv(entries));
}

async function handleExportDailyMetrics() {
  const entries = await appDb.dailyMetrics.toArray();
  downloadCsv("daily-metrics.csv", generateDailyMetricsCsv(entries));
}

<button
  type="button"
  className="settings-action-button"
  onClick={() => void handleExportDailyWellness()}
>
  {t("settings_export_daily_wellness")}
</button>
<button
  type="button"
  className="settings-action-button"
  onClick={() => void handleExportDailyMetrics()}
>
  {t("settings_export_daily_metrics")}
</button>
```

- [ ] **Step 4: Run targeted test to verify it passes**

Run: `npm test -- src/features/settings/components/settings-screen.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/components/data-management.tsx src/features/settings/components/settings-screen.test.tsx
git commit -m "feat: export daily wellness and metrics from settings"
```

---

### Task 3: Update i18n keys for export labels

**Files:**
- Modify: `src/features/i18n/messages/ja.ts`
- Modify: `src/features/i18n/messages/en.ts`

- [ ] **Step 1: Add failing translation assertions**

```ts
expect(messagesEn.settings_export_daily_wellness).toBe("Export daily wellness records (CSV)");
expect(messagesEn.settings_export_daily_metrics).toBe("Export body metrics records (CSV)");
expect(messagesJa.settings_export_daily_wellness).toBe("体調（dailyWellness）をエクスポート（CSV）");
expect(messagesJa.settings_export_daily_metrics).toBe("身体計測値をエクスポート（CSV）");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/settings/components/settings-screen.test.tsx`  
Expected: FAIL because the new translation keys do not exist yet.

- [ ] **Step 3: Add/replace translation keys**

```ts
// ja.ts
settings_export_daily_wellness: "体調（dailyWellness）をエクスポート（CSV）",
settings_export_daily_metrics: "身体計測値をエクスポート（CSV）",

// en.ts
settings_export_daily_wellness: "Export daily wellness records (CSV)",
settings_export_daily_metrics: "Export body metrics records (CSV)",
```

- [ ] **Step 4: Run tests to verify key resolution**

Run: `npm test -- src/features/settings/components/settings-screen.test.tsx src/features/settings/csv/history-csv.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "chore: update export labels for wellness and metrics"
```

---

### Task 4: Full regression and production validation

**Files:**
- No additional source files (validation task)

- [ ] **Step 1: Run repository tests**

Run: `npm test`  
Expected: PASS for all Vitest suites.

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS with no lint errors.

- [ ] **Step 3: Run build**

Run: `npm run build`  
Expected: PASS with no TypeScript/Next.js build failures.

- [ ] **Step 4: Commit final integration**

```bash
git add src/features/settings/components/data-management.tsx src/features/settings/csv/history-csv.ts src/features/settings/csv/history-csv.test.ts src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts src/features/settings/components/settings-screen.test.tsx
git commit -m "feat: migrate export to daily wellness and add metrics csv"
```

---

## Self-Review Checklist (completed)

- **Spec coverage:**  
  - condition export → dailyWellness export replacement: Task 1 + Task 2  
  - metrics export (`height/weight/bodyFat`) as separate CSV: Task 1 + Task 2  
  - settings wording update: Task 3  
  - existing export behavior preserved: Task 1 regression + Task 4 full validation
- **Placeholder scan:** No `TBD`/`TODO`/ambiguous filler steps.
- **Type consistency:** `DailyWellnessEntry`, `DailyMetricEntry`, `settings_export_daily_wellness`, and `settings_export_daily_metrics` are used consistently across tasks.
