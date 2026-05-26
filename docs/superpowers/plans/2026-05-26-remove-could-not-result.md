# Remove `could_not` — 「できなかった」を削除操作に統一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「できなかった」ボタンのクリックをログ保存ではなく記録削除に変更し、`could_not` を型・DB・UIから完全に除去する。

**Architecture:** `ExerciseLogResult` 型から `could_not` を削除して `"did" | "partial"` のみにする。`ExerciseLogActions` に `onClear` プロップを追加して「できなかった」ボタンはログ削除操作として機能させる。Dexie の version 4 マイグレーションで既存の `could_not` レコードをすべて削除する。

**Tech Stack:** TypeScript, React, Dexie (IndexedDB), Vitest, Testing Library

---

## File Map

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/lib/types.ts` | Modify | `ExerciseLogResult` から `could_not` を削除 |
| `src/features/storage/app-db.ts` | Modify | version 4 マイグレーション追加 |
| `src/features/storage/exercise-logs.repository.ts` | Modify | `deleteExerciseLogByDateAndExercise` 追加 |
| `src/features/logging/components/exercise-log-actions.tsx` | Modify | `onClear` プロップ追加、「できなかった」ボタンを削除操作に変更 |
| `src/features/logging/exercise-log-actions.test.tsx` | Modify | `onClear` のテスト追加、`could_not` 保存テストを修正 |
| `src/features/today/use-today-data.ts` | Modify | `clearExercise` 追加 |
| `src/features/today/components/recommended-exercise-card.tsx` | Modify | `onClear` プロップ追加 |
| `src/features/today/components/today-screen.tsx` | Modify | `onClear` を `RecommendedExerciseCard` に渡す |
| `src/features/today/recommended-exercise-card.test.tsx` | Modify | `onClear` プロップを追加 |
| `src/features/library/components/exercise-detail-screen.tsx` | Modify | `handleClear` 追加、`onClear` を渡す |
| `src/features/history/history-query.ts` | Modify | `HistoryDayLog.result` 型を `ExerciseLogResult` に変更 |
| `src/features/history/components/day-summary.tsx` | Modify | `could_not` オプション削除、`formatResult` 修正 |

---

### Task 1: 型定義と DB マイグレーション

**Files:**
- Modify: `src/lib/types.ts:3`
- Modify: `src/features/storage/app-db.ts`

- [ ] **Step 1: `ExerciseLogResult` から `could_not` を削除**

`src/lib/types.ts` の3行目を変更:

```ts
export type ExerciseLogResult = "did" | "partial";
```

- [ ] **Step 2: Dexie version 4 マイグレーションを追加**

`src/features/storage/app-db.ts` に version 4 を追加する。既存の version 3 の `.stores({...})` 定義を参考に、同じスキーマ定義を繰り返し、`upgrade` で `could_not` レコードを削除する:

```ts
this.version(4)
  .stores({
    logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
    conditions: "date, conditionLevel, note, updatedAt",
    exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
    dailyWellness: "date, physicalScore, mentalScore, updatedAt",
    dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
    selfCareCatalog: "id, sortOrder, isArchived",
    dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
  })
  .upgrade(async (tx) => {
    await tx.table("logs").where("result").equals("could_not").delete();
  });
```

- [ ] **Step 3: TypeScript のエラーを確認**

```powershell
npm run build 2>&1 | Select-String "could_not|error TS"
```

型エラーが出た箇所をメモしておく（以降のタスクで対応する）。

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/features/storage/app-db.ts
git commit -m "feat: remove could_not from ExerciseLogResult type and add DB migration"
```

---

### Task 2: リポジトリに削除ヘルパー追加

**Files:**
- Modify: `src/features/storage/exercise-logs.repository.ts`

- [ ] **Step 1: `deleteExerciseLogByDateAndExercise` を追加**

`src/features/storage/exercise-logs.repository.ts` に以下を追加する（`deleteExerciseLog` 関数の直後）:

```ts
export async function deleteExerciseLogByDateAndExercise(date: string, exerciseId: string): Promise<void> {
  await appDb.logs.where("[date+exerciseId]").equals([date, exerciseId]).delete();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/storage/exercise-logs.repository.ts
git commit -m "feat: add deleteExerciseLogByDateAndExercise repository helper"
```

---

### Task 3: `ExerciseLogActions` コンポーネントの変更

**Files:**
- Modify: `src/features/logging/components/exercise-log-actions.tsx`
- Test: `src/features/logging/exercise-log-actions.test.tsx`

- [ ] **Step 1: テストを先に修正（TDD）**

`src/features/logging/exercise-log-actions.test.tsx` を以下に置き換える:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseLogActions } from "./components/exercise-log-actions";

test("shows all shared logging actions and the current saved state", async () => {
  const user = userEvent.setup();
  const onLog = vi.fn();
  const onClear = vi.fn();

  renderWithLanguage(
    <ExerciseLogActions result="partial" onLog={onLog} onClear={onClear} />,
    { initialLanguage: "en" },
  );

  const didItButton = screen.getByRole("button", { name: /did it/i });
  const partlyButton = screen.getByRole("button", { name: /partly/i });
  const couldntButton = screen.getByRole("button", { name: /couldn't/i });

  expect(didItButton).toHaveAttribute("aria-pressed", "false");
  expect(partlyButton).toHaveAttribute("aria-pressed", "true");
  expect(couldntButton).not.toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Saved: Partly")).toBeInTheDocument();

  await user.click(couldntButton);

  expect(onClear).toHaveBeenCalledOnce();
  expect(onLog).not.toHaveBeenCalled();
});

test("translates logging buttons and saved state text", () => {
  renderWithLanguage(<ExerciseLogActions result="did" onLog={vi.fn()} onClear={vi.fn()} />);

  const buttons = screen.getAllByRole("button");
  expect(buttons[0]).toHaveTextContent("できた");
  expect(buttons[1]).toHaveTextContent("一部できた");
  expect(buttons[2]).toHaveTextContent("できなかった");
  expect(screen.getByText("保存済み: できた")).toBeInTheDocument();
});
```

- [ ] **Step 2: テストが失敗することを確認**

```powershell
npx vitest run src/features/logging/exercise-log-actions.test.tsx 2>&1
```

期待: `onClear` プロップが存在しないためコンパイルエラーまたはテスト失敗。

- [ ] **Step 3: コンポーネントを実装**

`src/features/logging/components/exercise-log-actions.tsx` を以下に置き換える:

```tsx
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseLogResult } from "@/lib/types";

type ExerciseLogActionsProps = {
  result: ExerciseLogResult | null;
  onLog: (result: ExerciseLogResult) => void;
  onClear: () => void;
};

export function ExerciseLogActions({ result, onLog, onClear }: ExerciseLogActionsProps) {
  const { t } = useTranslation();

  const logActions: Array<{ label: string; value: ExerciseLogResult }> = [
    { label: t("result_did"), value: "did" },
    { label: t("result_partial"), value: "partial" },
  ];

  function getSavedStateLabel(result: ExerciseLogResult | null) {
    if (result === "did") {
      return t("result_saved_did");
    }

    if (result === "partial") {
      return t("result_saved_partial");
    }

    return t("result_not_logged");
  }

  return (
    <div className="exercise-log-actions">
      <div className="exercise-log-actions__buttons" role="group" aria-label={t("result_group_label")}>
        {logActions.map((action) => (
          <button
            key={action.value}
            type="button"
            className={result === action.value ? "exercise-log-actions__button is-selected" : "exercise-log-actions__button"}
            aria-pressed={result === action.value}
            onClick={() => onLog(action.value)}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          className="exercise-log-actions__button"
          aria-pressed={false}
          onClick={onClear}
        >
          {t("result_couldnt")}
        </button>
      </div>
      <p className="exercise-log-actions__status" aria-live="polite">
        {getSavedStateLabel(result)}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: テストを実行して通過することを確認**

```powershell
npx vitest run src/features/logging/exercise-log-actions.test.tsx 2>&1
```

期待: 2件すべて PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/logging/components/exercise-log-actions.tsx src/features/logging/exercise-log-actions.test.tsx
git commit -m "feat: add onClear prop to ExerciseLogActions, could_not button now clears log"
```

---

### Task 4: `use-today-data` に `clearExercise` を追加

**Files:**
- Modify: `src/features/today/use-today-data.ts`

- [ ] **Step 1: `deleteExerciseLogByDateAndExercise` をインポートし `clearExercise` を追加**

`src/features/today/use-today-data.ts` のインポート行を変更して `deleteExerciseLogByDateAndExercise` を追加する:

```ts
import { deleteExerciseLogByDateAndExercise, listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
```

次に `logExercise` の `useCallback` の直後に `clearExercise` を追加する:

```ts
const clearExercise = useCallback(
  async (exerciseId: string) => {
    const selectedDayKey = toDayKey(dayKey);

    setLogResults((currentResults) => {
      const next = { ...currentResults };
      delete next[exerciseId];
      return next;
    });

    await deleteExerciseLogByDateAndExercise(selectedDayKey, exerciseId);
  },
  [dayKey],
);
```

そして `return` オブジェクトに `clearExercise` を追加する:

```ts
return {
  isHydrated: hydratedDayKey === dayKey,
  physicalScore,
  mentalScore,
  note,
  recommendations,
  logResults,
  conditionSaveError,
  setPhysicalScore: updatePhysicalScore,
  setMentalScore: updateMentalScore,
  setNote: updateNote,
  saveCondition: saveConditionEntry,
  logExercise,
  clearExercise,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/today/use-today-data.ts
git commit -m "feat: add clearExercise to useTodayData hook"
```

---

### Task 5: `RecommendedExerciseCard` に `onClear` を追加

**Files:**
- Modify: `src/features/today/components/recommended-exercise-card.tsx`
- Test: `src/features/today/recommended-exercise-card.test.tsx`

- [ ] **Step 1: テストに `onClear` を追加**

`src/features/today/recommended-exercise-card.test.tsx` の3つのテストすべての `renderWithLanguage` 呼び出しで `onClear={vi.fn()}` を追加する:

```tsx
// 1つ目のテスト
renderWithLanguage(
  <RecommendedExerciseCard exercise={exercise} result={null} watchHref="/watch" onLog={vi.fn()} onClear={vi.fn()} />,
);

// 2つ目のテスト
renderWithLanguage(
  <RecommendedExerciseCard
    exercise={exercise!}
    result={null}
    watchHref="/custom-watch-path"
    onLog={vi.fn()}
    onClear={vi.fn()}
  />,
  { initialLanguage: "en" }
);

// 3つ目のテスト
renderWithLanguage(
  <RecommendedExerciseCard
    exercise={exercise!}
    result={null}
    watchHref="/custom-watch-path"
    onLog={vi.fn()}
    onClear={vi.fn()}
  />,
);
```

- [ ] **Step 2: コンポーネントを実装**

`src/features/today/components/recommended-exercise-card.tsx` を以下に変更する:

```tsx
import Link from "next/link";

import { useTranslation } from "@/features/i18n/use-translation";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

type RecommendedExerciseCardProps = {
  exercise: ExerciseVideo;
  result: ExerciseLogResult | null;
  watchHref: string;
  onLog: (result: ExerciseLogResult) => void;
  onClear: () => void;
};

export function RecommendedExerciseCard({
  exercise,
  result,
  watchHref,
  onLog,
  onClear,
}: RecommendedExerciseCardProps) {
  const { t, formatIntensity } = useTranslation();
  const headingId = `recommendation-${exercise.id}`;
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

  return (
    <article className="card recommendation-card" aria-labelledby={headingId}>
      {thumbnailUrl ? (
        <div className="recommendation-card__thumbnail">
          <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
        </div>
      ) : null}
      <div className="recommendation-card__header">
        <div>
          <h3 id={headingId}>{exercise.title}</h3>
          <p>{exercise.description}</p>
        </div>
        <Link
          href={watchHref}
          className="recommendation-card__watch-link"
          aria-label={t("action_watch_aria", { title: exercise.title })}
        >
          {t("action_watch")}
        </Link>
      </div>

      <dl className="recommendation-card__meta">
        <div>
          <dt>{t("meta_duration")}</dt>
          <dd>{t("duration_minutes", { count: exercise.durationMinutes })}</dd>
        </div>
        <div>
          <dt>{t("meta_intensity")}</dt>
          <dd>{formatIntensity(exercise.intensity)}</dd>
        </div>
      </dl>

      <ExerciseLogActions result={result} onLog={onLog} onClear={onClear} />
    </article>
  );
}
```

- [ ] **Step 3: テストを実行して通過することを確認**

```powershell
npx vitest run src/features/today/recommended-exercise-card.test.tsx 2>&1
```

期待: 3件すべて PASS。

- [ ] **Step 4: Commit**

```bash
git add src/features/today/components/recommended-exercise-card.tsx src/features/today/recommended-exercise-card.test.tsx
git commit -m "feat: add onClear prop to RecommendedExerciseCard"
```

---

### Task 6: `TodayScreen` を更新

**Files:**
- Modify: `src/features/today/components/today-screen.tsx`

- [ ] **Step 1: `today-screen.tsx` の現在の内容を確認**

```powershell
Get-Content src/features/today/components/today-screen.tsx
```

- [ ] **Step 2: `clearExercise` を `useTodayData` から受け取り、`RecommendedExerciseCard` に渡す**

`src/features/today/components/today-screen.tsx` で `useTodayData` のデストラクチャリングに `clearExercise` を追加し、`RecommendedExerciseCard` に `onClear` を渡す。

変更前（該当箇所）:
```tsx
const { ..., logExercise } = useTodayData(date);
```

変更後:
```tsx
const { ..., logExercise, clearExercise } = useTodayData(date);
```

`RecommendedExerciseCard` の呼び出し箇所:
```tsx
<RecommendedExerciseCard
  ...
  onLog={(result) => void logExercise(exercise.id, result)}
  onClear={() => void clearExercise(exercise.id)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/today/components/today-screen.tsx
git commit -m "feat: wire clearExercise to RecommendedExerciseCard in TodayScreen"
```

---

### Task 7: `ExerciseDetailScreen` を更新

**Files:**
- Modify: `src/features/library/components/exercise-detail-screen.tsx`

- [ ] **Step 1: `deleteExerciseLogByDateAndExercise` をインポートし `handleClear` を追加**

`src/features/library/components/exercise-detail-screen.tsx` のインポートを変更:

```ts
import { deleteExerciseLogByDateAndExercise, listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
```

`handleLog` の `useCallback` の直後に `handleClear` を追加:

```ts
const handleClear = useCallback(async () => {
  const currentDayKey = toDayKey(new Date());

  setResult(null);

  await deleteExerciseLogByDateAndExercise(currentDayKey, exercise.id);
}, [exercise.id]);
```

`ExerciseLogActions` に `onClear` を渡す:

```tsx
<ExerciseLogActions result={result} onLog={(nextResult) => void handleLog(nextResult)} onClear={() => void handleClear()} />
```

- [ ] **Step 2: Commit**

```bash
git add src/features/library/components/exercise-detail-screen.tsx
git commit -m "feat: add handleClear to ExerciseDetailScreen"
```

---

### Task 8: 履歴画面から `could_not` を除去

**Files:**
- Modify: `src/features/history/history-query.ts`
- Modify: `src/features/history/components/day-summary.tsx`

- [ ] **Step 1: `history-query.ts` の型を更新**

`src/features/history/history-query.ts` で `HistoryDayLog` の `result` 型を変更:

変更前:
```ts
type HistoryDayLog = {
  id: string;
  exerciseId: string;
  title: string;
  result: "did" | "partial" | "could_not";
  loggedAt: string;
};
```

変更後:
```ts
import type { ExerciseLogResult } from "@/lib/types";

type HistoryDayLog = {
  id: string;
  exerciseId: string;
  title: string;
  result: ExerciseLogResult;
  loggedAt: string;
};
```

- [ ] **Step 2: `day-summary.tsx` の `formatResult` と `EditLogModal` の select を修正**

`src/features/history/components/day-summary.tsx` で:

`formatResult` 関数を修正（`could_not` のケースを削除）:

```ts
function formatResult(result: HistoryDaySummary["logs"][number]["result"]) {
  if (result === "did") return t("result_did");
  return t("result_partial");
}
```

`EditLogModal` の `<select>` から `could_not` の `<option>` を削除:

```tsx
<select
  id="edit-log-result"
  value={state.result}
  onChange={(e) => onChange({ ...state, result: e.target.value as ExerciseLogResult })}
>
  <option value="did">{t("result_did")}</option>
  <option value="partial">{t("result_partial")}</option>
</select>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/history/history-query.ts src/features/history/components/day-summary.tsx
git commit -m "feat: remove could_not from history query type and day summary edit modal"
```

---

### Task 9: 全テスト実行と最終確認

- [ ] **Step 1: 全テストを実行**

```powershell
npm test 2>&1
```

期待: すべての既存テストが PASS。

- [ ] **Step 2: ビルドを確認**

```powershell
npm run build 2>&1
```

期待: TypeScript エラーなし、ビルド成功。

- [ ] **Step 3: lint を確認**

```powershell
npm run lint 2>&1
```

期待: エラーなし。

- [ ] **Step 4: 最終コミット（必要な場合）**

未コミットの変更があれば:

```bash
git add -A
git commit -m "chore: final cleanup after could_not removal"
```
