# PC版レイアウト制約 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PC版の全ページでコンテンツ横幅を1280pxに制限し、flexレイアウトでカードを最適に配置する

**Architecture:** Tailwind CSSのクラス変更のみ。ロジック変更なし。main要素のmax-w制限と、各ページのflexレイアウト追加。

**Tech Stack:** Tailwind CSS

---

### Task 1: main コンテナの制約

**Files:**
- Modify: `src/components/app-shell/app-shell.tsx`

- [ ] **Step 1: main 要素のクラスを更新**

現在のコード（app-shell.tsx 42行目）:
```tsx
<main className="mx-auto grid w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4 lg:max-w-none lg:px-8 lg:pb-8">
```

変更後:
```tsx
<main className="mx-auto w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4 lg:max-w-screen-xl lg:px-8 lg:pb-8">
```

変更点: `grid` を削除、`lg:max-w-none` → `lg:max-w-screen-xl`

- [ ] **Step 2: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし（ビルド成功）

- [ ] **Step 3: コミット**

```bash
git add src/components/app-shell/app-shell.tsx
git commit -m "fix: constrain main container to max-w-screen-xl on PC"
```

---

### Task 2: ダッシュボードページ (/) の flex レイアウト

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx を更新**

現在のコード:
```tsx
export default function HomePage() {
  return (
    <AppShell currentPath="/">
      {/* Mobile: Show TodayScreen only */}
      <div className="lg:hidden">
        <TodayScreen />
      </div>

      {/* PC: Show TodayScreen + HistoryDashboard in 1:2 ratio */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <TodayScreen />
        </div>
        <div className="lg:col-span-2">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
```

変更後:
```tsx
export default function HomePage() {
  return (
    <AppShell currentPath="/">
      {/* Mobile: Show TodayScreen only */}
      <div className="lg:hidden">
        <TodayScreen />
      </div>

      {/* PC: flex layout with max-widths */}
      <div className="hidden lg:flex lg:gap-6 lg:justify-center">
        <div className="lg:max-w-[350px] lg:w-full">
          <TodayScreen />
        </div>
        <div className="lg:flex-1 lg:min-w-0">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
```

変更点: `lg:grid lg:grid-cols-3` → `lg:flex lg:gap-6 lg:justify-center`、各カードにmax-w追加

- [ ] **Step 2: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/app/page.tsx
git commit -m "feat: use flex layout for dashboard on PC"
```

---

### Task 3: 履歴ページ (/history) の flex レイアウト

**Files:**
- Modify: `src/app/history/page.tsx`

- [ ] **Step 1: history/page.tsx を更新**

現在のコード:
```tsx
export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      {/* Mobile: HistoryScreen with toggle */}
      <div className="lg:hidden">
        <HistoryScreen />
      </div>

      {/* PC: Calendar + Graphs side by side */}
      <div className="hidden lg:block">
        <HistoryDashboard />
      </div>
    </AppShell>
  );
}
```

変更後:
```tsx
export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      {/* Mobile: HistoryScreen with toggle */}
      <div className="lg:hidden">
        <HistoryScreen />
      </div>

      {/* PC: flex layout with max-widths */}
      <div className="hidden lg:flex lg:gap-6 lg:justify-center">
        <div className="lg:max-w-[350px] lg:w-full">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
```

変更点: `lg:block` → `lg:flex lg:gap-6 lg:justify-center`、HistoryDashboardにmax-w追加

- [ ] **Step 2: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/app/history/page.tsx
git commit -m "feat: use flex layout for history page on PC"
```

---

### Task 4: ライブラリページ (/library) の flex レイアウト

**Files:**
- Modify: `src/features/library/components/library-screen.tsx`

- [ ] **Step 1: library-screen.tsx の結果セクションに flex-wrap を追加**

現在のコード（78行目付近）:
```tsx
<section className="library-screen__results">
```

変更後:
```tsx
<section className="library-screen__results flex flex-wrap gap-4">
```

各カードにはmax-w-[320px]を追加する必要がある。カードの生成箇所を確認:

```tsx
{filteredExercises.map((exercise) => {
  const headingId = `library-${exercise.id}`;
  // ... カード要素
})}
```

- [ ] **Step 2: 各カードに max-w を追加**

カード要素に `max-w-[320px]` クラスを追加。実際のカードコードを確認してから適用。

- [ ] **Step 3: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/library/components/library-screen.tsx
git commit -m "feat: use flex-wrap layout for library cards on PC"
```

---

### Task 5: セルフケアページ (/self-care) の flex レイアウト

**Files:**
- Modify: `src/features/self-care/components/self-care-screen.tsx`

- [ ] **Step 1: self-care-screen.tsx のカードセクションに flex を追加**

現在のコード（48行目付近）:
```tsx
<>
  <WellnessCard ... />
  <MetricsCard ... />
  <Card className="grid gap-4">
```

変更後:
```tsx
<div className="flex flex-col gap-4 lg:flex-row lg:justify-center">
  <div className="lg:max-w-[400px] lg:w-full">
    <WellnessCard ... />
  </div>
  <div className="lg:max-w-[400px] lg:w-full">
    <MetricsCard ... />
  </div>
</div>
<Card className="grid gap-4">
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/self-care/components/self-care-screen.tsx
git commit -m "feat: use flex layout for self-care cards on PC"
```

---

### Task 6: 設定ページ (/settings) の flex レイアウト

**Files:**
- Modify: `src/features/settings/components/settings-screen.tsx`

- [ ] **Step 1: settings-screen.tsx の各セクションに max-w を追加**

現在のコード:
```tsx
<>
  <section className="card page-header">
    <h1>{t("settings_heading")}</h1>
  </section>

  <section className="card settings-section">
    <h2>{t("settings_library_section_heading")}</h2>
    <LibraryManagement />
  </section>

  <section className="card settings-section">
    <h2>{t("settings_data_section_heading")}</h2>
    <DataManagement />
  </section>

  <section className="card settings-section">
    <h2>{t("settings_google_drive_section_heading")}</h2>
    <GoogleDriveSettings />
  </section>
</>
```

変更後:
```tsx
<div className="flex flex-col gap-4 lg:items-center">
  <section className="card page-header w-full lg:max-w-[400px]">
    <h1>{t("settings_heading")}</h1>
  </section>

  <section className="card settings-section w-full lg:max-w-[400px]">
    <h2>{t("settings_library_section_heading")}</h2>
    <LibraryManagement />
  </section>

  <section className="card settings-section w-full lg:max-w-[400px]">
    <h2>{t("settings_data_section_heading")}</h2>
    <DataManagement />
  </section>

  <section className="card settings-section w-full lg:max-w-[400px]">
    <h2>{t("settings_google_drive_section_heading")}</h2>
    <GoogleDriveSettings />
  </section>
</div>
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build 2>&1 | head -20`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/settings/components/settings-screen.tsx
git commit -m "feat: constrain settings sections width on PC"
```

---

### Task 7: 最終確認

- [ ] **Step 1: 全テスト実行**

Run: `npm test -- --run 2>&1 | tail -30`
Expected: 既存テストが全てパス（新規テスト不要）

- [ ] **Step 2: ビルド最終確認**

Run: `npm run build 2>&1 | tail -10`
Expected: ビルド成功

- [ ] **Step 3: 最終コミット（必要に応じて）**

```bash
git add -A
git commit -m "chore: final layout constraint adjustments"
```
