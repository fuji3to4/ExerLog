# Condition/Wellness Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** コンディション画面を有効化し、Today とコンディションの体調入力を `daily_wellness` に統一したうえで、身長/体重/体脂肪率入力と履歴グラフ反映を一貫させる。

**Architecture:** `/self-care` はプレースホルダーをやめて `SelfCareScreen` を表示し、今回は wellness + metrics に責務を絞る。Today は `daily_condition` ではなく `daily_wellness` を読み書きし、推薦ロジックは wellness スコアから `ConditionLevel` を導出して既存関数を再利用する。i18n はキー再設計せず既存キーの文言更新で影響範囲を最小化する。

**Tech Stack:** Next.js 15, React 19, TypeScript, Dexie, Vitest, Testing Library

---

## File Structure (before tasks)

- **Modify:** `src/app/self-care/page.tsx`  
  `/self-care` の本体を `SelfCareScreen` に切り替える。
- **Modify:** `src/features/self-care/components/self-care-screen.tsx`  
  画面構成を wellness + metrics のみに絞る。
- **Modify:** `src/features/self-care/use-self-care-data.ts`  
  `daily_self_care_logs` 依存を外し、保存責務を `daily_wellness` + `daily_metrics` のみにする。
- **Modify:** `src/features/self-care/components/wellness-card.tsx`  
  表示文言と入力項目を「身体/心スコア」中心に整理（今回はメモ入力を除外）。
- **Modify:** `src/features/today/components/daily-condition-card.tsx`  
  3段階ラジオ + メモから、5段階 wellness 入力UIへ置換。
- **Modify:** `src/features/today/components/today-screen.tsx`  
  `DailyConditionCard` の props 変更に追従。
- **Modify:** `src/features/today/use-today-data.ts`  
  `get/saveDailyCondition` を `get/saveDailyWellness` に置換し、推薦用 `conditionLevel` を導出。
- **Create:** `src/features/recommendations/wellness-to-condition.ts`  
  wellness スコアから `ConditionLevel` を導出する単機能ヘルパー。
- **Create:** `src/features/recommendations/wellness-to-condition.test.ts`  
  導出ロジックを固定化。
- **Modify:** `src/features/i18n/messages/ja.ts`
- **Modify:** `src/features/i18n/messages/en.ts`  
  nav/self-care 文言を「コンディション」基調へ更新。
- **Modify (tests):**  
  `src/features/self-care/self-care-screen.test.tsx`  
  `src/features/today/today-screen.test.tsx`  
  `src/features/recommendations/get-todays-recommendations.test.ts`

---

### Task 1: Activate condition screen and narrow Self Care scope

**Files:**
- Modify: `src/app/self-care/page.tsx`
- Modify: `src/features/self-care/components/self-care-screen.tsx`
- Modify: `src/features/self-care/use-self-care-data.ts`
- Modify: `src/features/self-care/components/wellness-card.tsx`
- Test: `src/features/self-care/self-care-screen.test.tsx`

- [ ] **Step 1: Write failing tests for reduced scope (wellness + metrics only)**

```tsx
test("saves only wellness and metric rows from the condition screen", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });
  const [physicalScoreInput, mentalScoreInput, heightInput, weightInput, bodyFatInput] =
    await screen.findAllByRole("spinbutton");

  fireEvent.change(physicalScoreInput, { target: { value: "4" } });
  fireEvent.change(mentalScoreInput, { target: { value: "3" } });
  fireEvent.change(heightInput, { target: { value: "171" } });
  fireEvent.change(weightInput, { target: { value: "62" } });
  fireEvent.change(bodyFatInput, { target: { value: "18" } });

  await userEvent.setup().click(screen.getByRole("button", { name: /save/i }));

  await expect(getDailyWellness("2026-03-23")).resolves.toMatchObject({ physicalScore: 4, mentalScore: 3 });
  await expect(listDailyMetricsByDate("2026-03-23")).resolves.toHaveLength(3);
  await expect(listDailySelfCareEntriesByDate("2026-03-23")).resolves.toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/self-care/self-care-screen.test.tsx`  
Expected: FAIL because current screen still renders and saves self-care log rows.

- [ ] **Step 3: Implement minimal production changes**

`src/app/self-care/page.tsx`:
```tsx
"use client";

import { AppShell } from "@/components/app-shell/app-shell";
import { SelfCareScreen } from "@/features/self-care/components/self-care-screen";

export default function SelfCarePage() {
  return (
    <AppShell currentPath="/self-care">
      <SelfCareScreen />
    </AppShell>
  );
}
```

`src/features/self-care/components/self-care-screen.tsx`:
```tsx
{/* keep page header */}
<WellnessCard
  physicalScore={physicalScore}
  mentalScore={mentalScore}
  onPhysicalScoreChange={setPhysicalScore}
  onMentalScoreChange={setMentalScore}
/>
<MetricsCard metrics={metrics} onMetricChange={setMetric} />
```

`src/features/self-care/use-self-care-data.ts`:
```ts
const [physicalScore, setPhysicalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
const [mentalScore, setMentalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
const [metrics, setMetrics] = useState<MetricState>(EMPTY_METRICS);

await Promise.all([
  saveDailyWellness({ date: selectedDayKey, physicalScore, mentalScore, note: "" }),
  replaceDailyMetrics(selectedDayKey, metricDrafts),
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/self-care/self-care-screen.test.tsx`  
Expected: PASS, and no assertion references self-care log rows.

- [ ] **Step 5: Commit**

```bash
git add src/app/self-care/page.tsx src/features/self-care/components/self-care-screen.tsx src/features/self-care/use-self-care-data.ts src/features/self-care/components/wellness-card.tsx src/features/self-care/self-care-screen.test.tsx
git commit -m "feat: activate condition screen with wellness and metrics"
```

---

### Task 2: Unify Today condition input onto daily_wellness

**Files:**
- Modify: `src/features/today/use-today-data.ts`
- Modify: `src/features/today/components/daily-condition-card.tsx`
- Modify: `src/features/today/components/today-screen.tsx`
- Create: `src/features/recommendations/wellness-to-condition.ts`
- Create: `src/features/recommendations/wellness-to-condition.test.ts`
- Test: `src/features/today/today-screen.test.tsx`

- [ ] **Step 1: Write failing tests for Today wellness persistence and hydration**

```tsx
test("saves physical and mental scores to daily_wellness from Today", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  const [physicalInput, mentalInput] = await screen.findAllByRole("spinbutton");
  fireEvent.change(physicalInput, { target: { value: "2" } });
  fireEvent.change(mentalInput, { target: { value: "4" } });
  await userEvent.setup().click(screen.getByRole("button", { name: /save/i }));

  await expect(getDailyWellness("2026-03-23")).resolves.toMatchObject({ physicalScore: 2, mentalScore: 4 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/today/today-screen.test.tsx`  
Expected: FAIL because Today currently reads/writes `daily_condition`.

- [ ] **Step 3: Add wellness-to-condition mapper**

`src/features/recommendations/wellness-to-condition.ts`:
```ts
import type { ConditionLevel } from "@/lib/types";

export function wellnessToConditionLevel(physicalScore: number, mentalScore: number): ConditionLevel {
  const average = (physicalScore + mentalScore) / 2;
  if (average <= 2) return "tired";
  if (average >= 4) return "good";
  return "okay";
}
```

`src/features/recommendations/wellness-to-condition.test.ts`:
```ts
test("maps low average to tired", () => {
  expect(wellnessToConditionLevel(1, 2)).toBe("tired");
});
test("maps high average to good", () => {
  expect(wellnessToConditionLevel(4, 5)).toBe("good");
});
test("maps middle range to okay", () => {
  expect(wellnessToConditionLevel(3, 3)).toBe("okay");
});
```

- [ ] **Step 4: Replace Today storage usage and UI props**

`src/features/today/use-today-data.ts`:
```ts
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { wellnessToConditionLevel } from "@/features/recommendations/wellness-to-condition";

const [physicalScore, setPhysicalScore] = useState<WellnessScore>(3);
const [mentalScore, setMentalScore] = useState<WellnessScore>(3);

const conditionLevel = useMemo(
  () => wellnessToConditionLevel(physicalScore, mentalScore),
  [physicalScore, mentalScore],
);

await saveDailyWellness({ date: selectedDayKey, physicalScore, mentalScore, note: "" });
```

`src/features/today/components/daily-condition-card.tsx`:
```tsx
type DailyConditionCardProps = {
  physicalScore: number;
  mentalScore: number;
  onPhysicalScoreChange: (value: number) => void;
  onMentalScoreChange: (value: number) => void;
  onSave: () => void | Promise<void>;
};
```

- [ ] **Step 5: Run tests**

Run:  
`npm test -- src/features/recommendations/wellness-to-condition.test.ts src/features/today/today-screen.test.tsx`  
Expected: PASS, and recommendations still change when wellness scores change.

- [ ] **Step 6: Commit**

```bash
git add src/features/today/use-today-data.ts src/features/today/components/daily-condition-card.tsx src/features/today/components/today-screen.tsx src/features/recommendations/wellness-to-condition.ts src/features/recommendations/wellness-to-condition.test.ts src/features/today/today-screen.test.tsx
git commit -m "feat: unify today condition input with daily wellness"
```

---

### Task 3: Rename Self Care wording to Condition wording

**Files:**
- Modify: `src/features/i18n/messages/ja.ts`
- Modify: `src/features/i18n/messages/en.ts`
- Modify: `src/components/app-shell/bottom-nav.tsx` (only if key split is introduced; otherwise no code change)
- Test: `src/features/today/today-screen.test.tsx`
- Test: `src/features/self-care/self-care-screen.test.tsx`

- [ ] **Step 1: Write failing assertion for nav/screen wording**

```tsx
expect(screen.getByRole("link", { name: /コンディション/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /コンディション/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify wording mismatch**

Run: `npm test -- src/features/self-care/self-care-screen.test.tsx src/features/today/today-screen.test.tsx`  
Expected: FAIL because current wording still "セルフケア / Self Care".

- [ ] **Step 3: Update message values**

`src/features/i18n/messages/ja.ts`:
```ts
nav_self_care: "コンディション",
self_care_heading: "コンディション",
self_care_description: "身体と心の状態、測定値を記録しましょう。",
```

`src/features/i18n/messages/en.ts`:
```ts
nav_self_care: "Condition",
self_care_heading: "Condition",
self_care_description: "Track body and mind scores with daily metrics.",
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/features/self-care/self-care-screen.test.tsx src/features/today/today-screen.test.tsx`  
Expected: PASS with new wording assertions.

- [ ] **Step 5: Commit**

```bash
git add src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts src/features/self-care/self-care-screen.test.tsx src/features/today/today-screen.test.tsx
git commit -m "chore: relabel self care UI as condition"
```

---

### Task 4: Verify recommendation compatibility and full regression

**Files:**
- Modify: `src/features/recommendations/get-todays-recommendations.test.ts`
- Modify: `src/features/today/today-screen.test.tsx` (add explicit recommendation behavior checks from wellness)
- Optional Modify: `src/features/history/history-screen.test.tsx` (only if wording snapshots/assertions break)

- [ ] **Step 1: Add failing compatibility tests around recommendation thresholds**

```ts
test("still excludes high intensity when mapped condition is tired", () => {
  const conditionLevel = wellnessToConditionLevel(1, 2);
  const result = getTodaysRecommendations({ catalog: exerciseCatalog, conditionLevel, date: "2026-03-23" });
  expect(result.every((item) => item.intensity !== "high")).toBe(true);
});
```

- [ ] **Step 2: Run recommendation tests**

Run: `npm test -- src/features/recommendations/get-todays-recommendations.test.ts`  
Expected: FAIL before mapper integration assertions are wired.

- [ ] **Step 3: Adjust/extend tests for migrated Today behavior**

```tsx
await user.type(physicalInput, "1");
await user.type(mentalInput, "2");
await user.click(saveButton);
expect(await screen.findByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
```

- [ ] **Step 4: Run full validation commands**

Run:  
`npm test`  
Expected: all Vitest suites PASS

Run:  
`npm run build`  
Expected: Next.js production build succeeds with no type errors

- [ ] **Step 5: Commit**

```bash
git add src/features/recommendations/get-todays-recommendations.test.ts src/features/today/today-screen.test.tsx src/features/recommendations/wellness-to-condition.test.ts
git commit -m "test: lock recommendation behavior after wellness migration"
```

---

## Self-Review Checklist (completed)

- **Spec coverage:**  
  - コンディション画面有効化 → Task 1  
  - wellness + metrics に限定 → Task 1  
  - Today を `daily_wellness` 統一 → Task 2  
  - 推薦ロジック影響の明示対応 → Task 2 / Task 4  
  - 文言をコンディション基調に変更 → Task 3
- **Placeholder scan:** `"TODO"`, `"TBD"`, `"implement later"` などの曖昧語なし。
- **Type consistency:** `physicalScore/mentalScore` を Today/Self Care/mapper で統一し、推薦系は `ConditionLevel` を mapper 経由で供給。
