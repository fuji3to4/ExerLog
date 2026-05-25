# 日本語言語切替機能 実装計画

> **エージェント向け注記:** 必須サブスキル: このプランをタスクごとに実装する際は superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使用してください。ステップはチェックボックス（`- [ ]`）構文で進捗を追跡します。

**目標:** アプリ全体の固定 UI 文字列に対して、日本語をデフォルトとする言語切替機能を追加し、選択した言語をローカルに永続化し、エクササイズのタイトル・説明は元の言語のまま保つ。

**アーキテクチャ:** アプリシェル境界に小さなクライアントサイド i18n レイヤーを導入する。`LanguageProvider` と静的な `ja` / `en` メッセージ辞書、ロケール対応のフォーマットヘルパー、ヘッダーマウントの切替コンポーネントを使用する。外部コンテンツはそのままにして、固定 UI とアプリが制御する enum ラベル（強度・目的・コンディションレベル・ログ結果など）のみを翻訳する。

**技術スタック:** Next.js App Router、React 19、TypeScript、localStorage、`Intl.DateTimeFormat`、Vitest、React Testing Library

---

## ファイル構成

### 新しい i18n 基盤

- 作成: `src\features\i18n\language.ts` — 言語タイプ、ストレージキー、ロケールマップ、バリデーション、初期言語解決ヘルパー。
- 作成: `src\features\i18n\formatting.ts` — ロケール対応の日付ヘルパーと固定 enum ラベルフォーマッタ。
- 作成: `src\features\i18n\messages\ja.ts` — すべての固定 UI キーの日本語メッセージ辞書。
- 作成: `src\features\i18n\messages\en.ts` — すべての固定 UI キーの英語メッセージ辞書。
- 作成: `src\features\i18n\messages\index.ts` — 共有メッセージ型とエクスポートされた辞書。
- 作成: `src\features\i18n\language-provider.tsx` — プロバイダー、コンテキスト、`localStorage` と `document.documentElement.lang` との言語状態同期。
- 作成: `src\features\i18n\use-translation.ts` — `language`、`setLanguage`、`messages`、フォーマットヘルパーを返すフック。
- 作成: `src\features\i18n\language-provider.test.tsx` — デフォルト言語・永続化された言語・無効値のフォールバック・`html lang` 更新のフォーカスされたテスト。
- 作成: `src\test\render-with-language.tsx` — 言語状態をシードして `LanguageProvider` でレンダリングするテストヘルパー。

### 共有シェル

- 変更: `src\app\layout.tsx` — アプリを `LanguageProvider` でラップし、ハイドレーション前の言語ブートストラップスクリプトを注入し、安全なハイドレーションのためにドキュメントをマークする。
- 変更: `src\app\globals.css` — 狭い画面でも切替コンポーネントが見えるようにヘッダーレイアウトルールを追加する。
- 作成: `src\components\app-shell\language-switcher.tsx` — `日本語 / English` を表示する常に見えるヘッダー切替コンポーネント。
- 変更: `src\components\app-shell\app-shell.tsx` — トップヘッダー領域を追加し、ページコンテンツの下にボトムナビを保つ。
- 作成: `src\components\app-shell\app-shell.test.tsx` — ヘッダーに切替コンポーネントが見えることとシェルテキストの更新を確認する。
- 変更: `src\components\app-shell\bottom-nav.tsx` — ナビラベルとナビの `aria-label` を翻訳する。
- 変更: `src\components\app-shell\bottom-nav.test.tsx` — 翻訳されたナビラベルとアクティブ状態をアサートする。

### Today フローと共有ログ記録 UI

- 変更: `src\features\logging\components\exercise-log-actions.tsx` — ボタンラベル、グループラベル、保存済み状態コピーを翻訳する。
- 変更: `src\features\logging\exercise-log-actions.test.tsx` — 日本語デフォルトラベルと保存済み状態テキストをアサートする。
- 変更: `src\features\today\components\daily-condition-card.tsx` — 見出し、ヘルパーコピー、ラジオラベル、ノートラベル、プレースホルダー、保存ボタンを翻訳する。
- 変更: `src\features\today\components\recommended-exercise-card.tsx` — エクササイズコンテンツはそのままにして固定の視聴/メタラベルを翻訳する。
- 変更: `src\features\today\components\today-screen.tsx` — ページコピーを翻訳し、ロケール対応の日付フォーマットを使用する。
- 変更: `src\features\today\recommended-exercise-card.test.tsx` — 視聴ラベルは変わるがエクササイズタイトルはそのままであることをアサートする。
- 変更: `src\features\today\today-screen.test.tsx` — プロバイダーでレンダリングするようにテストを更新し、言語切替の動作を確認する。

### ライブラリとエクササイズ詳細

- 変更: `src\features\library\components\library-filters.tsx` — 見出し、ラベル、プレースホルダー、オプションラベルを翻訳する。
- 変更: `src\features\library\components\library-screen.tsx` — タイトル/説明はそのままにして固定 UI、メタラベル、視聴リンクコピーを翻訳する。
- 変更: `src\features\library\components\exercise-detail-screen.tsx` — 固定ラベル、ローディングコピー、enum 表示値を翻訳する。
- 変更: `src\features\library\library-screen.test.tsx` — フィルタラベルと生のエクササイズコンテンツ動作を確認する。
- 変更: `src\app\exercises\[exerciseId]\page.test.tsx` — 日本語デフォルト UI と永続化されたログテキストの詳細ページの期待値を更新する。

### 履歴フロー

- 変更: `src\features\history\components\history-screen.tsx` — ページヘッダーコピーを翻訳する。
- 変更: `src\features\history\components\history-calendar.tsx` — カレンダー見出しを翻訳し、ロケール対応の曜日ラベルを使用し、「完了」サフィックスをローカライズする。
- 変更: `src\features\history\components\day-summary.tsx` — エクササイズタイトルはそのままにしてセクション見出し、空の状態、結果ラベル、コンディションラベルを翻訳する。
- 変更: `src\features\history\history-screen.test.tsx` — ローカライズされたカレンダーラベルとサマリーコピーをアサートする。

### テスト設定

- 変更: `vitest.setup.ts` — テスト間で `localStorage` をクリアして言語永続化が漏れないようにする。
- 変更: `src\app\page.test.tsx` — 新しいシェルを通してホームルートをレンダリングし、日本語デフォルトナビゲーションが見えることを確認する。

---

## タスク 1: i18n コアとテストハーネスの構築

**ファイル:**
- 作成: `src\features\i18n\language.ts`
- 作成: `src\features\i18n\formatting.ts`
- 作成: `src\features\i18n\messages\ja.ts`
- 作成: `src\features\i18n\messages\en.ts`
- 作成: `src\features\i18n\messages\index.ts`
- 作成: `src\features\i18n\language-provider.tsx`
- 作成: `src\features\i18n\use-translation.ts`
- 作成: `src\features\i18n\language-provider.test.tsx`
- 作成: `src\test\render-with-language.tsx`
- 変更: `vitest.setup.ts`

- [ ] **ステップ 1: 失敗するプロバイダーテストを書く**

```tsx
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "./language-provider";
import { useTranslation } from "./use-translation";

function Probe() {
  const { language } = useTranslation();
  return <span>{language}</span>;
}

test("永続化された値がない場合は日本語をデフォルトとする", () => {
  window.localStorage.removeItem("exerlog-language");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("ja")).toBeInTheDocument();
});

test("永続化された英語を使用してドキュメントの lang を更新する", () => {
  window.localStorage.setItem("exerlog-language", "en");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("en")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
});
```

- [ ] **ステップ 2: フォーカスされた i18n テストを実行する**

実行: `npm run test -- src\features\i18n\language-provider.test.tsx`  
期待: プロバイダー、フック、ヘルパーがまだ存在しないため FAIL

- [ ] **ステップ 3: 最小限の i18n コアを実装する**

```ts
export type Language = "ja" | "en";

export const DEFAULT_LANGUAGE: Language = "ja";
export const LANGUAGE_STORAGE_KEY = "exerlog-language";

export function isLanguage(value: string | null): value is Language {
  return value === "ja" || value === "en";
}

export function readStoredLanguage(): Language {
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
```

```tsx
const [language, setLanguageState] = useState<Language>(() =>
  typeof document !== "undefined" && (document.documentElement.dataset.language === "ja" || document.documentElement.dataset.language === "en")
    ? (document.documentElement.dataset.language as Language)
    : readStoredLanguage(),
);
```

以下のための安定したキーを持つ `ja` / `en` 辞書を実装する:
- シェルラベル
- today/library/history/detail コピー
- ログ記録結果ラベル
- コンディションラベル
- 強度/目的/身体部位の表示ラベル

`vitest.setup.ts` に `afterEach(() => window.localStorage.clear())` を追加する。

- [ ] **ステップ 4: フォーカスされた i18n テストを再実行する**

実行: `npm run test -- src\features\i18n\language-provider.test.tsx`  
期待: PASS

- [ ] **ステップ 5: 基盤をコミットする**

```bash
git add vitest.setup.ts src/features/i18n src/test/render-with-language.tsx
git commit -m "feat: add i18n language foundation"
```

---

## タスク 2: 言語プロバイダーをアプリシェルに統合する

**ファイル:**
- 変更: `src\app\layout.tsx`
- 変更: `src\app\globals.css`
- 作成: `src\components\app-shell\language-switcher.tsx`
- 変更: `src\components\app-shell\app-shell.tsx`
- 作成: `src\components\app-shell\app-shell.test.tsx`
- 変更: `src\components\app-shell\bottom-nav.tsx`
- 変更: `src\components\app-shell\bottom-nav.test.tsx`
- 変更: `src\app\page.test.tsx`

- [ ] **ステップ 1: 失敗するシェルテストを書く**

```tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";

test("モバイルサイズのレイアウトでヘッダーに言語切替コンポーネントを表示する", () => {
  renderWithLanguage(
    <AppShell currentPath="/">
      <section>content</section>
    </AppShell>,
  );

  expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /メインナビゲーション/i })).toBeInTheDocument();
});
```

- [ ] **ステップ 2: シェルフォーカステストを実行する**

実行: `npm run test -- src\components\app-shell\app-shell.test.tsx src\components\app-shell\bottom-nav.test.tsx src\app\page.test.tsx`  
期待: 翻訳されたヘッダーがなく、ナビがまだ英語テキストをレンダリングするため FAIL

- [ ] **ステップ 3: シェル統合を実装する**

```tsx
<html lang="ja" suppressHydrationWarning>
  <body>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            var value = localStorage.getItem("exerlog-language");
            var language = value === "en" ? "en" : "ja";
            document.documentElement.lang = language;
            document.documentElement.dataset.language = language;
          })();
        `,
      }}
    />
    <LanguageProvider>{children}</LanguageProvider>
  </body>
</html>
```

```tsx
<header className="app-shell__header">
  <h1 className="app-shell__brand">ExerLog</h1>
  <LanguageSwitcher />
</header>
```

ボトムナビのラベルと `aria-label` を翻訳し、メニューに隠すのではなくヘッダーに直接切替コンポーネントを表示する。  
モバイル幅でヘッダーが読みやすく切替コンポーネントに到達できるために必要な CSS のみを追加する。

- [ ] **ステップ 4: シェルフォーカステストを再実行する**

実行: `npm run test -- src\components\app-shell\app-shell.test.tsx src\components\app-shell\bottom-nav.test.tsx src\app\page.test.tsx`  
期待: PASS

- [ ] **ステップ 5: シェル作業をコミットする**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/app-shell src/app/page.test.tsx
git commit -m "feat: add header language switcher"
```

---

## タスク 3: Today スクリーンと共有ログ記録コントロールの翻訳

**ファイル:**
- 変更: `src\features\logging\components\exercise-log-actions.tsx`
- 変更: `src\features\logging\exercise-log-actions.test.tsx`
- 変更: `src\features\today\components\daily-condition-card.tsx`
- 変更: `src\features\today\components\recommended-exercise-card.tsx`
- 変更: `src\features\today\components\today-screen.tsx`
- 変更: `src\features\today\recommended-exercise-card.test.tsx`
- 変更: `src\features\today\today-screen.test.tsx`

- [ ] **ステップ 1: 日本語デフォルトと生のエクササイズタイトルに対する失敗する Today/ログ記録テストを追加する**

```tsx
test("エクササイズタイトルを変えずにデフォルトで日本語の固定 UI を表示する", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /体調を保存/i })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Neck Mobility を見る/i })).toBeInTheDocument();
});
```

```tsx
test("エクササイズコンテンツを翻訳せずに Today の固定 UI を英語に切り替える", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save condition/i })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Neck Mobility" })).toBeInTheDocument();
});
```

- [ ] **ステップ 2: フォーカスされた Today テストを実行する**

実行: `npm run test -- src\features\today\today-screen.test.tsx src\features\today\recommended-exercise-card.test.tsx src\features\logging\exercise-log-actions.test.tsx`  
期待: コンポーネントがまだ英語文字列をハードコードし、`en-US` フォーマットを直接使用しているため FAIL

- [ ] **ステップ 3: Today の翻訳を実装する**

```tsx
const { t, formatLongDate, formatResultLabel, formatConditionLabel, formatIntensityLabel } = useTranslation();

<h1>{t("today.title")}</h1>
<p>{formatLongDate(date)}</p>
<button>{t("today.saveCondition")}</button>
<Link aria-label={t("common.watchExercise", { title: exercise.title })}>
  {t("common.watch")}
</Link>
```

以下を翻訳する:
- Today ページ見出しとヘルパーコピー
- ローディング状態コピー
- デイリーコンディションのラジオラベルとノートテキスト
- エクササイズログ記録ボタンラベルと保存済み状態テキスト
- 視聴リンクの動詞と固定メタデータラベル

`exercise.title` と `exercise.description` は**翻訳しない**。

- [ ] **ステップ 4: フォーカスされた Today テストを再実行する**

実行: `npm run test -- src\features\today\today-screen.test.tsx src\features\today\recommended-exercise-card.test.tsx src\features\logging\exercise-log-actions.test.tsx`  
期待: PASS

- [ ] **ステップ 5: Today フローをコミットする**

```bash
git add src/features/logging src/features/today
git commit -m "feat: translate today flow"
```

---

## タスク 4: ライブラリとエクササイズ詳細の固定 UI を翻訳する

**ファイル:**
- 変更: `src\features\library\components\library-filters.tsx`
- 変更: `src\features\library\components\library-screen.tsx`
- 変更: `src\features\library\components\exercise-detail-screen.tsx`
- 変更: `src\features\library\library-screen.test.tsx`
- 変更: `src\app\exercises\[exerciseId]\page.test.tsx`

- [ ] **ステップ 1: 失敗するライブラリ/詳細テストを書く**

```tsx
test("デフォルトで日本語のライブラリフィルタをレンダリングする", () => {
  renderWithLanguage(<LibraryScreen />);

  expect(screen.getByRole("heading", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/運動を検索/i)).toHaveAttribute("placeholder", "タイトルまたは説明で検索");
  expect(screen.getByRole("link", { name: /Neck Mobility を見る/i })).toBeInTheDocument();
});
```

```tsx
test("詳細スクリーンでインポートされたコンテンツをそのまま保つ", async () => {
  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }));

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /動画を見る/i })).toBeInTheDocument();
});
```

- [ ] **ステップ 2: フォーカスされたライブラリ/詳細テストを実行する**

実行: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`  
期待: フィルタコピー・視聴ラベル・メタデータラベル・ローディングコピーがまだ英語のみのため FAIL

- [ ] **ステップ 3: ライブラリ/詳細の翻訳を実装する**

```tsx
<dt>{t("exercise.duration")}</dt>
<dd>{t("exercise.minutes", { count: exercise.durationMinutes })}</dd>

<dt>{t("exercise.intensity")}</dt>
<dd>{formatIntensityLabel(exercise.intensity)}</dd>
```

以下を翻訳する:
- ライブラリページ見出しとヘルパーコピー
- フィルターグループ見出し・ラベル・プレースホルダー・選択オプションラベル
- 視聴リンクの動詞と `aria-label`
- 詳細ページのローディングコピーと固定メタデータラベル
- アプリが制御する enum 値（`purpose`、`intensity`、`bodyArea`）

エクササイズのタイトルと説明はそのままにする。

- [ ] **ステップ 4: フォーカスされたライブラリ/詳細テストを再実行する**

実行: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`  
期待: PASS

- [ ] **ステップ 5: ライブラリ/詳細作業をコミットする**

```bash
git add src/features/library src/app/exercises/[exerciseId]/page.test.tsx
git commit -m "feat: translate library and detail screens"
```

---

## タスク 5: 履歴フローとロケール対応カレンダーラベルの翻訳

**ファイル:**
- 変更: `src\features\history\components\history-screen.tsx`
- 変更: `src\features\history\components\history-calendar.tsx`
- 変更: `src\features\history\components\day-summary.tsx`
- 変更: `src\features\history\history-screen.test.tsx`

- [ ] **ステップ 1: 失敗する履歴テストを書く**

```tsx
test("デフォルトで日本語のカレンダーラベルとサマリーコピーを使用する", async () => {
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />);

  const completedDay = await screen.findByRole("button", { name: /3月23日.*実施済み/i });
  expect(completedDay).toBeInTheDocument();
});
```

```tsx
test("エクササイズタイトルをそのままに履歴コピーを英語に切り替える", async () => {
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(screen.getByText("Neck Mobility")).toBeInTheDocument();
});
```

- [ ] **ステップ 2: フォーカスされた履歴テストを実行する**

実行: `npm run test -- src\features\history\history-screen.test.tsx`  
期待: カレンダーラベル・空の状態コピー・結果ラベルがまだ英語のみのため FAIL

- [ ] **ステップ 3: 履歴の翻訳を実装する**

```tsx
function formatCalendarLabel(date: string, completed: boolean) {
  const label = formatMonthDay(date);
  return completed ? t("history.completedDay", { date: label }) : label;
}
```

以下を翻訳する:
- 履歴ページ見出しとヘルパーコピー
- カレンダーセクション見出しと説明
- ローカライズされた日付フォーマットを含むカレンダーの `aria-label` コンテンツ
- 日次サマリーのセクション見出しと空の状態
- 結果ラベル（`did`、`partial`、`could_not`）とコンディションラベル（`good`、`okay`、`tired`）

日次サマリー内のエクササイズタイトルはそのままにする。

- [ ] **ステップ 4: フォーカスされた履歴テストを再実行する**

実行: `npm run test -- src\features\history\history-screen.test.tsx`  
期待: PASS

- [ ] **ステップ 5: 履歴作業をコミットする**

```bash
git add src/features/history
git commit -m "feat: translate history flow"
```

---

## タスク 6: 完全な検証と受け入れチェックの実行

**ファイル:**
- 必要に応じて変更: タスク1〜5で触れたすべてのファイル（フルスイートで明らかになった失敗に対処するため）

- [ ] **ステップ 1: フルテストスイートを実行する**

実行: `npm run test`  
期待: PASS

- [ ] **ステップ 2: リントを実行する**

実行: `npm run lint`  
期待: PASS

- [ ] **ステップ 3: プロダクションビルドを実行する**

実行: `npm run build`  
期待: PASS

- [ ] **ステップ 4: コードとテストに照らして完成した動作を確認する**

以下をコードとテストで確認する:
- 値が保存されていない場合は日本語がデフォルト
- 無効な保存済み値は日本語にフォールバックする
- ヘッダー切替コンポーネントは常に見える
- 選択した言語が永続化される
- Today、Library、History、詳細スクリーン全体で固定 UI が翻訳される
- エクササイズのタイトル/説明は元の言語のまま
- `html lang` とローカライズされた日付フォーマットがアクティブな言語に一致する

- [ ] **ステップ 5: 検証済みフィーチャーをコミットする**

```bash
git add src docs/superpowers/plans/2026-03-24-japanese-language-switcher.md
git commit -m "feat: add Japanese-default language switching"
```
