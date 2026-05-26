# History Edit Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 履歴の日別サマリーに閲覧/編集モードを導入し、編集モード時のみ運動・metrics・wellness・conditionの編集/削除（＋未登録時追加）を可能にする。

**Architecture:** 既存の `DaySummary` を中心にモード状態を追加し、各セクションのアクションを条件描画する。データ更新は既存repositoryを優先再利用し、metricsの単一項目操作APIとwellness削除APIのみ追加する。まずrepositoryテストを先に固め、次にUIテスト→実装の順でTDDで進める。

**Tech Stack:** Next.js App Router, React, TypeScript, Dexie, Vitest, Testing Library

---

### Task 1: Repository APIs for per-metric operations and wellness delete

**Files:**
- Modify: `src/features/storage/daily-metrics.repository.ts`
- Modify: `src/features/storage/daily-wellness.repository.ts`
- Test: `src/features/storage/self-care-storage.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
import {
  listDailyMetricsByDate,
  replaceDailyMetrics,
  upsertDailyMetric,
  deleteDailyMetric,
} from "./daily-metrics.repository";
import {
  getDailyWellness,
  saveDailyWellness,
  deleteDailyWellness,
} from "./daily-wellness.repository";

test("upsertDailyMetric updates an existing metric for the day", async () => {
  await replaceDailyMetrics("2026-04-01", [{ metricType: "weight", value: 62, unit: "kg" }]);
  await upsertDailyMetric("2026-04-01", { metricType: "weight", value: 63, unit: "kg" });
  const metrics = await listDailyMetricsByDate("2026-04-01");
  expect(metrics).toHaveLength(1);
  expect(metrics[0]).toMatchObject({ metricType: "weight", value: 63, unit: "kg" });
});

test("deleteDailyMetric removes only the requested metric type", async () => {
  await replaceDailyMetrics("2026-04-01", [
    { metricType: "height", value: 171, unit: "cm" },
    { metricType: "weight", value: 62, unit: "kg" },
  ]);
  await deleteDailyMetric("2026-04-01", "weight");
  const metrics = await listDailyMetricsByDate("2026-04-01");
  expect(metrics).toHaveLength(1);
  expect(metrics[0]?.metricType).toBe("height");
});

test("deleteDailyWellness removes the daily wellness row", async () => {
  await saveDailyWellness({
    date: "2026-04-02",
    physicalScore: 4,
    mentalScore: 3,
    note: "steady",
  });
  await deleteDailyWellness("2026-04-02");
  expect(await getDailyWellness("2026-04-02")).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/storage/self-care-storage.test.ts`  
Expected: FAIL with messages similar to `upsertDailyMetric is not exported` and `deleteDailyWellness is not a function`.

- [ ] **Step 3: Implement minimal repository functions**

```ts
// daily-metrics.repository.ts
export async function upsertDailyMetric(date: string, metric: MetricDraft) {
  const existing = await appDb.dailyMetrics
    .where("[date+metricType]")
    .equals([date, metric.metricType])
    .first();

  const recordedAt = localIsoNow();
  if (existing) {
    await appDb.dailyMetrics.update(existing.id, { ...metric, recordedAt });
    return;
  }

  await appDb.dailyMetrics.add({
    id: crypto.randomUUID(),
    date,
    ...metric,
    recordedAt,
  });
}

export function deleteDailyMetric(date: string, metricType: DailyMetricEntry["metricType"]) {
  return appDb.dailyMetrics.where("[date+metricType]").equals([date, metricType]).delete();
}
```

```ts
// daily-wellness.repository.ts
export function deleteDailyWellness(date: string) {
  return appDb.dailyWellness.delete(date);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/storage/self-care-storage.test.ts`  
Expected: PASS with all tests green in that file.

- [ ] **Step 5: Commit**

```bash
git add src/features/storage/daily-metrics.repository.ts src/features/storage/daily-wellness.repository.ts src/features/storage/self-care-storage.test.ts
git commit -m "feat: add history metric and wellness repository edit helpers"
```

### Task 2: Add DaySummary view/edit mode toggle and gate existing actions

**Files:**
- Modify: `src/features/history/components/day-summary.tsx`
- Modify: `src/features/i18n/messages/ja.ts`
- Modify: `src/features/i18n/messages/en.ts`
- Test: `src/features/history/components/day-summary.test.tsx`

- [ ] **Step 1: Write failing UI tests for mode toggle behavior**

```ts
import userEvent from "@testing-library/user-event";

it("defaults to view mode and hides action buttons", async () => {
  await act(async () => {
    render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
  });
  expect(screen.getByText("history_mode_view")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "action_edit" })).toBeNull();
  expect(screen.queryByRole("button", { name: "action_delete" })).toBeNull();
});

it("shows action buttons after switching to edit mode", async () => {
  const user = userEvent.setup();
  await act(async () => {
    render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
  });
  await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
  expect(screen.getAllByRole("button", { name: "action_edit" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "action_delete" }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/history/components/day-summary.test.tsx`  
Expected: FAIL because `history_mode_view`/`history_mode_edit` labels and switch do not exist yet.

- [ ] **Step 3: Implement mode toggle and conditional rendering**

```tsx
const [isEditMode, setIsEditMode] = useState(false);

<div className="day-summary__mode-toggle">
  <label htmlFor="day-summary-edit-mode">{t("history_mode_edit")}</label>
  <input
    id="day-summary-edit-mode"
    type="checkbox"
    role="switch"
    aria-label={t("history_mode_edit")}
    checked={isEditMode}
    onChange={(e) => setIsEditMode(e.target.checked)}
  />
  <span>{isEditMode ? t("history_mode_edit") : t("history_mode_view")}</span>
</div>

{isEditMode && (
  <div className="day-summary__item-actions">
    <button type="button" className="day-summary__action-btn">{t("action_edit")}</button>
    <button type="button" className="day-summary__action-btn day-summary__action-btn--danger">{t("action_delete")}</button>
  </div>
)}
```

```ts
// ja.ts / en.ts
history_mode_view: "閲覧", // en: "View"
history_mode_edit: "編集", // en: "Edit"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/history/components/day-summary.test.tsx`  
Expected: PASS and toggle tests succeed.

- [ ] **Step 5: Commit**

```bash
git add src/features/history/components/day-summary.tsx src/features/history/components/day-summary.test.tsx src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "feat: add history day summary view and edit mode toggle"
```

### Task 3: Add metrics/wellness add-edit-delete UI in DaySummary edit mode

**Files:**
- Modify: `src/features/history/components/day-summary.tsx`
- Modify: `src/features/i18n/messages/ja.ts`
- Modify: `src/features/i18n/messages/en.ts`
- Test: `src/features/history/components/day-summary.test.tsx`

- [ ] **Step 1: Write failing tests for metrics and wellness operations in edit mode**

```ts
vi.mock("@/features/storage/daily-metrics.repository", () => ({
  upsertDailyMetric: vi.fn(),
  deleteDailyMetric: vi.fn(),
}));
vi.mock("@/features/storage/daily-wellness.repository", () => ({
  saveDailyWellness: vi.fn(),
  deleteDailyWellness: vi.fn(),
}));

it("shows metric add controls when metric is missing in edit mode", async () => {
  const user = userEvent.setup();
  await act(async () => {
    render(<DaySummary selectedDate="2024-01-15" summary={makeSummary({ metrics: [] })} />);
  });
  await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
  expect(screen.getByRole("button", { name: "history_metrics_add_height" })).toBeInTheDocument();
});

it("calls deleteDailyMetric for individual metric deletion", async () => {
  const user = userEvent.setup();
  await act(async () => {
    render(<DaySummary selectedDate="2024-01-15" summary={makeSummary({
      metrics: [{ metricType: "weight", value: 62, unit: "kg" }],
    })} />);
  });
  await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
  await user.click(screen.getByRole("button", { name: "history_metrics_delete_weight" }));
  expect(deleteDailyMetric).toHaveBeenCalledWith("2024-01-15", "weight");
});

it("calls deleteDailyWellness when deleting wellness", async () => {
  const user = userEvent.setup();
  await act(async () => {
    render(<DaySummary selectedDate="2024-01-15" summary={makeSummary({
      wellness: { physicalScore: 4, mentalScore: 3, note: "steady" },
    })} />);
  });
  await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
  await user.click(screen.getByRole("button", { name: "history_wellness_delete" }));
  expect(deleteDailyWellness).toHaveBeenCalledWith("2024-01-15");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/history/components/day-summary.test.tsx`  
Expected: FAIL with missing button labels and missing handlers for metric/wellness operations.

- [ ] **Step 3: Implement metrics/wellness edit UI and handlers**

```tsx
import { deleteDailyMetric, upsertDailyMetric } from "@/features/storage/daily-metrics.repository";
import { deleteDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";

async function handleSaveMetric(metricType: MetricType, value: number, unit: string) {
  if (!selectedDate) return;
  await upsertDailyMetric(selectedDate, { metricType, value, unit });
  onChanged?.();
}

async function handleDeleteMetric(metricType: MetricType) {
  if (!selectedDate) return;
  if (!window.confirm(t("history_metric_delete_confirm"))) return;
  await deleteDailyMetric(selectedDate, metricType);
  onChanged?.();
}

async function handleDeleteWellness() {
  if (!selectedDate) return;
  if (!window.confirm(t("history_wellness_delete_confirm"))) return;
  await deleteDailyWellness(selectedDate);
  onChanged?.();
}

async function handleSaveWellness(physicalScore: number, mentalScore: number, note: string) {
  if (!selectedDate) return;
  await saveDailyWellness({ date: selectedDate, physicalScore: physicalScore as 1|2|3|4|5, mentalScore: mentalScore as 1|2|3|4|5, note });
  onChanged?.();
}
```

```ts
// ja.ts
history_metrics_add_height: "身長を追加",
history_metrics_add_weight: "体重を追加",
history_metrics_add_body_fat: "体脂肪率を追加",
history_metrics_delete_height: "身長を削除",
history_metrics_delete_weight: "体重を削除",
history_metrics_delete_body_fat: "体脂肪率を削除",
history_metric_delete_confirm: "この測定値を削除しますか？",
history_wellness_add: "ウェルネスを追加",
history_wellness_edit: "ウェルネスを編集",
history_wellness_delete: "ウェルネスを削除",
history_wellness_delete_confirm: "この日のウェルネス記録を削除しますか？",
```

```ts
// en.ts
history_metrics_add_height: "Add height",
history_metrics_add_weight: "Add weight",
history_metrics_add_body_fat: "Add body fat",
history_metrics_delete_height: "Delete height",
history_metrics_delete_weight: "Delete weight",
history_metrics_delete_body_fat: "Delete body fat",
history_metric_delete_confirm: "Delete this metric entry?",
history_wellness_add: "Add wellness",
history_wellness_edit: "Edit wellness",
history_wellness_delete: "Delete wellness",
history_wellness_delete_confirm: "Delete wellness record for this day?",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/history/components/day-summary.test.tsx`  
Expected: PASS with new metric/wellness edit-mode scenarios.

- [ ] **Step 5: Commit**

```bash
git add src/features/history/components/day-summary.tsx src/features/history/components/day-summary.test.tsx src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "feat: support history metrics and wellness edits in edit mode"
```

### Task 4: Add integration tests for edit-mode visibility and past-day behavior

**Files:**
- Modify: `src/features/history/history-screen.test.tsx`
- Modify: `src/features/history/components/day-summary.tsx` (only if integration test reveals missing wiring)

- [ ] **Step 1: Write failing integration tests from user flows**

```ts
test("keeps edit and delete controls hidden in view mode", async () => {
  const user = userEvent.setup();
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });
  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);
  expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
});

test("shows controls in edit mode and applies to past selected date", async () => {
  const user = userEvent.setup();
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });
  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: /delete/i }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/history/history-screen.test.tsx`  
Expected: FAIL because current integration flow still shows always-on action buttons.

- [ ] **Step 3: Wire any missing behavior exposed by integration tests**

```tsx
// day-summary.tsx (representative checks to add around each action area)
{isEditMode && (
  <div className="day-summary__item-actions">
    <button type="button" className="day-summary__action-btn" onClick={() => setEditingCondition({ conditionLevel: summary.conditionLevel!, note: summary.note })}>
      {t("action_edit")}
    </button>
    <button type="button" className="day-summary__action-btn day-summary__action-btn--danger" onClick={() => void handleDeleteCondition()}>
      {t("action_delete")}
    </button>
  </div>
)}

// metric delete button example with date-safe handler
<button
  type="button"
  className="day-summary__action-btn day-summary__action-btn--danger"
  aria-label={t("history_metrics_delete_weight")}
  onClick={() => void handleDeleteMetric("weight")}
>
  {t("action_delete")}
</button>

// wellness delete button example with date-safe handler
<button
  type="button"
  className="day-summary__action-btn day-summary__action-btn--danger"
  aria-label={t("history_wellness_delete")}
  onClick={() => void handleDeleteWellness()}
>
  {t("action_delete")}
</button>
```

- [ ] **Step 4: Run target and full repository tests**

Run: `npm test -- src/features/history/history-screen.test.tsx`  
Expected: PASS.

Run: `npm test`  
Expected: PASS with all Vitest suites green.

- [ ] **Step 5: Build and commit**

Run: `npm run build`  
Expected: PASS with Next.js build/type-check success.

```bash
git add src/features/history/history-screen.test.tsx src/features/history/components/day-summary.tsx
git commit -m "test: cover history edit-mode visibility and past-day editing flows"
```
