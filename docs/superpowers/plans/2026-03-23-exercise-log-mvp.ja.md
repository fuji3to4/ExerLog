# エクササイズログ MVP 実装計画

> **エージェント向け注記:** 必須: このプランを実装する際は superpowers:subagent-driven-development（サブエージェントが利用可能な場合）または superpowers:executing-plans を使用してください。ステップはチェックボックス（`- [ ]`）構文で進捗を追跡します。

**目標:** ユーザーがキュレーションされたエクササイズ動画を視聴し、日々のエクササイズ完了を記録し、1日1件のシンプルなコンディション入力を行い、カレンダー形式の履歴ビューでアクティビティを振り返ることができる、ローカルファーストの Next.js PWA を構築する。

**アーキテクチャ:** クライアントサイドの状態と Dexie による IndexedDB 永続化を持つ、スタティックファースト Next.js App Router アプリを構築する。コードはフィーチャー（`catalog`、`today`、`logging`、`history`、`storage`）ごとに整理し、各ルートがすべてのロジックをページに置くのではなく、フォーカスされたコンポーネントとリポジトリを組み合わせるようにする。

**技術スタック:** Next.js App Router、TypeScript、React、Dexie（IndexedDB）、Vitest、React Testing Library、fake-indexeddb、next-pwa、ESLint

---

## ファイル構成

### アプリ・設定

- 作成: `package.json`
- 作成: `tsconfig.json`
- 作成: `next-env.d.ts`
- 作成: `next.config.ts`
- 作成: `vitest.config.ts`
- 作成: `vitest.setup.ts`
- 作成: `eslint.config.mjs`
- 作成: `public\manifest.webmanifest`
- 作成: `src\app\layout.tsx`
- 作成: `src\app\globals.css`
- 作成: `src\app\page.tsx`
- 作成: `src\app\library\page.tsx`
- 作成: `src\app\history\page.tsx`
- 作成: `src\app\exercises\[exerciseId]\page.tsx`
- 作成: `src\app\exercises\[exerciseId]\page.test.tsx`
- 作成: `src\app\icon.svg`
- 作成: `src\app\page.test.tsx`

### 共有ドメイン・ヘルパー

- 作成: `src\lib\types.ts`
- 作成: `src\lib\date\day-key.ts`
- 作成: `src\lib\date\day-key.test.ts`
- 作成: `src\lib\date\month-grid.ts`

### バンドル済みエクササイズカタログ・レコメンドロジック

- 作成: `src\features\catalog\exercise-catalog.ts`
- 作成: `src\features\catalog\catalog.test.ts`
- 作成: `src\features\recommendations\get-todays-recommendations.ts`
- 作成: `src\features\recommendations\get-todays-recommendations.test.ts`

### ローカル永続化

- 作成: `src\features\storage\app-db.ts`
- 作成: `src\features\storage\exercise-logs.repository.ts`
- 作成: `src\features\storage\daily-condition.repository.ts`
- 作成: `src\features\storage\storage.test.ts`

### 共有ログ記録 UI

- 作成: `src\features\logging\components\exercise-log-actions.tsx`
- 作成: `src\features\logging\exercise-log-actions.test.tsx`

### Today フロー

- 作成: `src\features\today\components\daily-condition-card.tsx`
- 作成: `src\features\today\components\recommended-exercise-card.tsx`
- 作成: `src\features\today\components\today-screen.tsx`
- 作成: `src\features\today\use-today-data.ts`
- 作成: `src\features\today\today-screen.test.tsx`

### ライブラリフロー

- 作成: `src\features\library\components\library-filters.tsx`
- 作成: `src\features\library\components\library-screen.tsx`
- 作成: `src\features\library\components\exercise-detail-screen.tsx`
- 作成: `src\features\library\library-screen.test.tsx`

### 履歴フロー

- 作成: `src\features\history\history-query.ts`
- 作成: `src\features\history\components\history-calendar.tsx`
- 作成: `src\features\history\components\day-summary.tsx`
- 作成: `src\features\history\components\history-screen.tsx`
- 作成: `src\features\history\history-screen.test.tsx`

### 共有 UI シェル

- 作成: `src\components\app-shell\bottom-nav.tsx`
- 作成: `src\components\app-shell\bottom-nav.test.tsx`

---

## チャンク 1: 基盤とドメインのセットアップ

### タスク 1: スタティックファースト Next.js アプリシェルのスキャフォールド

**ファイル:**
- 作成: `package.json`
- 作成: `package-lock.json`
- 作成: `tsconfig.json`
- 作成: `next-env.d.ts`
- 作成: `next.config.ts`
- 作成: `eslint.config.mjs`
- 作成: `vitest.config.ts`
- 作成: `vitest.setup.ts`
- 作成: `src\app\layout.tsx`
- 作成: `src\app\globals.css`
- 作成: `src\app\page.tsx`
- 作成: `src\app\library\page.tsx`
- 作成: `src\app\history\page.tsx`
- 作成: `src\components\app-shell\bottom-nav.tsx`
- 作成: `src\components\app-shell\bottom-nav.test.tsx`
- 作成: `src\app\page.test.tsx`

- [ ] **ステップ 1: 失敗するアプリシェルテストを書く**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("プライマリナビゲーションラベルをレンダリングする", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { BottomNav } from "./bottom-nav";

test("現在の遷移先をアクティブとしてマークする", () => {
  render(<BottomNav currentPath="/library" />);

  expect(screen.getByRole("link", { name: /library/i })).toHaveAttribute("aria-current", "page");
});
```

```ts
import { toDayKey } from "@/lib/date/day-key";

test("ローカル日付を YYYY-MM-DD の日付キーにフォーマットする", () => {
  expect(toDayKey(new Date(2026, 2, 23))).toBe("2026-03-23");
});
```

- [ ] **ステップ 2: テストコマンドを実行してリポジトリが未設定であることを確認する**

実行: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx`  
期待: `package.json` とテストスクリプトがまだ空のリポジトリに存在しないため FAIL

- [ ] **ステップ 3: アプリとテストスクリプトのスキャフォールド**

以下のスクリプトを含む最小限の `package.json` を作成する:

```json
{
  "dependencies": {
    "dexie": "4.0.10",
    "next": "15.2.4",
    "next-pwa": "5.6.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.2.0",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "22.13.10",
    "@types/react": "19.0.10",
    "@types/react-dom": "19.0.4",
    "eslint": "9.22.0",
    "eslint-config-next": "15.2.4",
    "fake-indexeddb": "6.0.0",
    "jsdom": "26.0.0",
    "typescript": "5.8.2",
    "vitest": "3.0.8"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
}
```

`next.config.ts` をスタティックファースト出力と PWA 安全設定にする:

```ts
const nextConfig = {
  output: "export",
  reactStrictMode: true,
};

export default nextConfig;
```

`next-pwa` はこのチャンクでインストールするが、設定は意図的に **チャンク3 タスク7** で行う。

- [ ] **ステップ 4: 依存関係をインストールしてベースライン設定ファイルを追加する**

実行: `npm install`  
期待: `package-lock.json` が作成され、エラーなくインストールが完了する

ベースライン設定ファイルを作成する:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom";
```

```ts
// next-env.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

```js
// eslint.config.mjs
import nextVitals from "eslint-config-next/core-web-vitals";

export default [...nextVitals];
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

- [ ] **ステップ 5: フォーカスされたテストを再実行して、失敗がアプリコードの欠如によるものであることを確認する**

実行: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx`  
期待: ルートファイルとナビゲーションコンポーネントがまだ実装されていないため FAIL

- [ ] **ステップ 6: グローバルスタイルと共有シェルレイアウトを追加する**

`src\app\globals.css` に以下の責務を持たせる:
- モバイルファーストのスペーシング
- 大きなタップターゲット
- シンプルなカードレイアウト
- スティッキーなボトムナビゲーションのスペーシング
- `.app-shell` コンテナの幅とパディング
- `.bottom-nav` モバイルナビゲーションの扱い
- フィーチャーパネル用の `.card` と `.button-row` ユーティリティクラス

- [ ] **ステップ 7: 最小限のルーティングアプリシェルを実装する**

`layout.tsx`、`page.tsx`、`library/page.tsx`、`history/page.tsx`、`bottom-nav.tsx` を作成し、シンプルなモバイルファーストシェルで3つのプライマリ遷移先をレンダリングするようにする。

境界ルール:
- `page.tsx`、`library/page.tsx`、`history/page.tsx` は薄いルートエントリポイントとして保つ
- 共有ナビゲーション/レイアウトの責務は `layout.tsx` と `bottom-nav.tsx` に置く
- フィーチャーロジックはルートファイルではなくフィーチャーコンポーネントとフックに置く
- アプリは `output: "export"` を使用するため、**チャンク3 タスク5** が `src\app\exercises\[exerciseId]\page.tsx` の `generateStaticParams` を担当する

各ルートの出力:
- `page.tsx` は `Today` の見出しをレンダリングする
- `library/page.tsx` は `Library` の見出しをレンダリングする
- `history/page.tsx` は `History` の見出しをレンダリングする
- `bottom-nav.tsx` は3つのすべての遷移先へのリンクをレンダリングする

- [ ] **ステップ 8: フォーカスされたテストを実行し、次にリントを実行する**

実行: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx && npm run lint && npm run build && Test-Path out\index.html && Test-Path out\library\index.html && Test-Path out\history\index.html`  
期待:
- フォーカスされたテストが PASS
- リントが通る
- ビルドが通る
- `Test-Path` が `out\index.html`、`out\library\index.html`、`out\history\index.html` に対して `True` を返す

- [ ] **ステップ 9: コミット**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts src
git commit -m "feat: scaffold exercise log app shell" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### タスク 2: ドメインモデル、バンドル済みカタログ、レコメンドルールの追加

**ファイル:**
- 作成: `src\lib\types.ts`
- 作成: `src\lib\date\day-key.ts`
- 作成: `src\lib\date\day-key.test.ts`
- 作成: `src\features\catalog\exercise-catalog.ts`
- 作成: `src\features\catalog\catalog.test.ts`
- 作成: `src\features\recommendations\get-todays-recommendations.ts`
- 作成: `src\features\recommendations\get-todays-recommendations.test.ts`

- [ ] **ステップ 1: 失敗するカタログ・レコメンドテストを書く**

```ts
import { exerciseCatalog } from "./exercise-catalog";

test("カタログにはブラウジングとログ記録に十分なメタデータが含まれている", () => {
  expect(exerciseCatalog).toHaveLength(6);
  expect(exerciseCatalog[0]).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    description: expect.any(String),
    videoUrl: expect.any(String),
    thumbnailUrl: expect.any(String),
    bodyArea: expect.any(String),
    purpose: expect.any(String),
    durationMinutes: expect.any(Number),
    intensity: expect.any(String),
  });
});
```

```ts
import { getTodaysRecommendations } from "./get-todays-recommendations";
import { exerciseCatalog } from "../catalog/exercise-catalog";

test("ユーザーが疲れているときに低強度アイテムを返す", () => {
  const recommendations = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "tired",
    date: "2026-03-23",
  });

  expect(recommendations.every((item) => item.intensity !== "high")).toBe(true);
});
```

```ts
test("1日につき最大3件の安定したレコメンドセットを返す", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result).toHaveLength(3);
  expect(result).toEqual(
    getTodaysRecommendations({
      catalog: exerciseCatalog,
      conditionLevel: "okay",
      date: "2026-03-23",
    }),
  );
});
```

```ts
test("既知の日付に対して同じ既知のレコメンド順序を返す", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result.map((item) => item.id)).toEqual([
    "neck-mobility-5",
    "breathing-reset-3",
    "walk-in-place-10",
  ]);
});
```

```ts
test("カタログは計画されたブラウジング次元をカバーしている", () => {
  expect(new Set(exerciseCatalog.map((item) => item.bodyArea)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.purpose)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.intensity)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.durationMinutes)).size).toBeGreaterThanOrEqual(2);
});
```

- [ ] **ステップ 2: 新しいテストを実行して失敗することを確認する**

実行: `npm run test -- src\features\catalog\catalog.test.ts src\features\recommendations\get-todays-recommendations.test.ts src\lib\date\day-key.test.ts`  
期待: カタログ、レコメンド、day-key モジュールが存在しないため FAIL

- [ ] **ステップ 3: 共有タイプとバンドル済みエクササイズデータの作成**

`src\lib\types.ts` に `ExerciseVideo`、`ExerciseLog`、`DailyConditionEntry`、`ExerciseLogResult`、`ConditionLevel` を定義する。

最低限含めるフィールド:
- `ExerciseVideo`: `id`、`title`、`description`、`videoUrl`、`thumbnailUrl`、`bodyArea`、`purpose`、`durationMinutes`、`intensity`
- `ExerciseLog`: `id`、`date`、`exerciseId`、`result`、`loggedAt`
- `DailyConditionEntry`: `date`、`conditionLevel`、`note`、`updatedAt`

値のユニオンをプロダクト契約に固定する:
- `ConditionLevel = "good" | "okay" | "tired"`
- `ExerciseLogResult = "did" | "partial" | "could_not"`

`exercise-catalog.ts` に以下をカバーする最低 **6件のエクササイズ** のキュレーション済み配列をシードする:
- 少なくとも2つの身体部位
- 少なくとも2つの目的
- 低・中・高（少なくとも1件）の強度オプション
- 短い・中程度の時間

MVP 計画のために、`thumbnailUrl` はデータフィールドとしてのみ残すことができる。初期 UI はローカルのサムネイル画像ファイルの存在に依存してはならない。

以下を含む具体的なエントリを使用する:

```ts
export const exerciseCatalog: ExerciseVideo[] = [
  {
    id: "neck-mobility-5",
    title: "Neck Mobility",
    description: "Gentle seated mobility work for the neck and shoulders.",
    videoUrl: "https://www.youtube.com/watch?v=example1",
    thumbnailUrl: "/thumbnails/neck-mobility.jpg",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  },
  // ... 残りの5エントリ
];
```

- [ ] **ステップ 4: day-key ユーティリティの追加**

日付データがキー付けされるすべての場所で使用されるローカルカレンダーヘルパーを `src\lib\date\day-key.ts` と `src\lib\date\day-key.test.ts` に作成する:

```ts
export function toDayKey(date: Date | string): string {
  if (typeof date === "string") return date;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
```

同じローカル日付が常に同じ `YYYY-MM-DD` キーに解決されることを証明するフォーカスされたテストを1件追加する。

- [ ] **ステップ 5: 決定論的レコメンドルールの実装**

以下を行う小さな純粋関数を使用する:
- `conditionLevel === "tired"` のときに高強度アイテムをフィルタリングアウトする
- 日付によってレコメンドをローテーションする
- 最大3件のアイテムを返す

- [ ] **ステップ 6: テストを実行する**

実行: `npm run test -- src\features\catalog\catalog.test.ts src\features\recommendations\get-todays-recommendations.test.ts src\lib\date\day-key.test.ts && npm run lint && npm run build`  
期待:
- すべてのテストが PASS
- レコメンドテストが `2026-03-23` に対して固定の3件結果を証明する
- リントが通る
- ビルドが通る

- [ ] **ステップ 7: コミット**

```bash
git add src\lib src\features\catalog src\features\recommendations
git commit -m "feat: add bundled catalog and recommendation rules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## チャンク 2: ローカル永続化と Today フロー

### タスク 3: フォーカスされたリポジトリを用いた IndexedDB 永続化の実装

**ファイル:**
- 作成: `src\features\storage\app-db.ts`
- 作成: `src\features\storage\exercise-logs.repository.ts`
- 作成: `src\features\storage\daily-condition.repository.ts`
- 変更: `vitest.setup.ts`
- 作成: `src\features\storage\storage.test.ts`

- [ ] **ステップ 1: 失敗するリポジトリテストを書く**

```ts
test("1日につき1件のデイリーコンディションをアップサートする", async () => {
  await saveDailyCondition({ date: "2026-03-23", conditionLevel: "okay", note: "" });
  await saveDailyCondition({ date: "2026-03-23", conditionLevel: "tired", note: "legs feel heavy" });

  const entry = await getDailyCondition("2026-03-23");
  expect(entry?.conditionLevel).toBe("tired");
  expect(entry?.note).toBe("legs feel heavy");
});
```

```ts
test("エクササイズと日付ごとに1件のログ結果を保存する", async () => {
  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "partial",
  });

  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "did",
  });

  const logs = await listExerciseLogsForDay("2026-03-23");
  expect(logs).toHaveLength(1);
  expect(logs[0]?.result).toBe("did");
});
```

- [ ] **ステップ 2: ストレージテストを実行して失敗することを確認する**

実行: `npm run test -- src\features\storage\storage.test.ts`  
期待: Dexie テーブルとリポジトリが存在しないため FAIL

- [ ] **ステップ 3: Dexie スキーマの実装**

2つのテーブルを持つ1つの Dexie データベースを使用する:

```ts
logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]"
conditions: "date, conditionLevel, note, updatedAt"
```

- [ ] **ステップ 4: リポジトリヘルパーの実装**

リポジトリの責務を狭く保つ:
- `exercise-logs.repository.ts` はエクササイズログの CRUD/クエリヘルパーのみを扱う
- `daily-condition.repository.ts` はコンディションの読み書きヘルパーのみを扱う

`saveExerciseLog` は `date + exerciseId` の一意性セマンティクスを使用し、繰り返しのクリックで重複を作成する代わりに既存の行を置き換えるようにする。

- [ ] **ステップ 5: IndexedDB のテスト設定を追加する**

リポジトリテストが Node で実行されるよう `vitest.setup.ts` で `fake-indexeddb` を使用する。この依存関係はタスク1でインストール済み。

- [ ] **ステップ 6: ストレージテストを実行する**

実行: `npm run test -- src\features\storage\storage.test.ts`  
期待: PASS

- [ ] **ステップ 7: コミット**

```bash
git add vitest.setup.ts src\features\storage
git commit -m "feat: add local persistence repositories" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### タスク 4: デイリーコンディションとワンタップログ記録で Today スクリーンを構築する

**ファイル:**
- 作成: `src\features\logging\components\exercise-log-actions.tsx`
- 作成: `src\features\logging\exercise-log-actions.test.tsx`
- 作成: `src\features\today\components\daily-condition-card.tsx`
- 作成: `src\features\today\components\recommended-exercise-card.tsx`
- 作成: `src\features\today\components\today-screen.tsx`
- 作成: `src\features\today\use-today-data.ts`
- 変更: `src\app\page.tsx`
- 変更: `src\app\page.test.tsx`
- 作成: `src\features\today\today-screen.test.tsx`

- [ ] **ステップ 1: 失敗する Today スクリーンテストを書く**

```tsx
test("ユーザーがホーム画面からデイリーコンディションを保存してエクササイズを記録できる", async () => {
  render(<TodayScreen date="2026-03-23" />);

  expect(screen.getByRole("heading", { name: /march 23, 2026/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /okay/i }));
  await user.click(screen.getByRole("button", { name: /save condition/i }));
  await user.click(screen.getByRole("button", { name: /did it/i, exact: false }));

  expect(await screen.findByText(/condition saved/i)).toBeInTheDocument();
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("初回レンダリング時に既存のコンディションノートと既存のログ状態を補完する", async () => {
  await seedTodayState();
  render(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByDisplayValue(/legs feel heavy/i)).toBeInTheDocument();
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("選択された日のレコメンドリストを短く安定に保つ", async () => {
  render(<TodayScreen date="2026-03-23" />);

  const cards = await screen.findAllByRole("article");
  expect(cards).toHaveLength(3);
  expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
    "Neck Mobility",
    "Breathing Reset",
    "Walk in Place",
  ]);
});
```

```tsx
test("ユーザーが既存のデイリーコンディションを編集してレコメンドを更新できる", async () => {
  await seedTodayState();
  render(<TodayScreen date="2026-03-23" />);

  await user.click(screen.getByRole("button", { name: /tired/i }));
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  expect(await screen.findByText(/condition saved/i)).toBeInTheDocument();
  expect(await screen.findByText(/low intensity/i)).toBeInTheDocument();
});
```

```tsx
test("共有ログ記録アクションが3つの結果ボタンと現在の保存状態を公開する", () => {
  render(<ExerciseLogActions currentResult="did" onLog={vi.fn()} />);

  expect(screen.getByRole("button", { name: /did it/i, exact: false })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /partly/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /couldn't/i })).toBeInTheDocument();
  expect(screen.getByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("today のコントロールがキーボードで到達可能で明確にラベル付けされている", async () => {
  render(<TodayScreen date="2026-03-23" />);

  await user.tab();
  expect(screen.getByRole("button", { name: /feeling good/i })).toHaveFocus();
});
```

```tsx
test("Today スクリーンから視聴とライブラリのパスを表示する", async () => {
  render(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/exercises/neck-mobility-5");
  expect(screen.getByRole("link", { name: /browse full library/i })).toHaveAttribute("href", "/library");
});
```

```tsx
test("ホームルートが Today スクリーンをレンダリングする", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
});
```

- [ ] **ステップ 2: Today スクリーンテストを実行して失敗することを確認する**

実行: `npm run test -- src\features\today\today-screen.test.tsx src\features\logging\exercise-log-actions.test.tsx`  
期待: Today コンポーネントが存在しないため FAIL

- [ ] **ステップ 3: クライアントのみの Today データフックを実装する**

`src\features\today\use-today-data.ts` を作成して以下を行う:
- `getTodaysRecommendations` を呼び出す
- マウント後に IndexedDB コンディション/ログ状態を読み込む
- `src\app\page.tsx` から Dexie アクセスを除外する
- 選択された日の安定した3件のレコメンドリストを公開する
- ユーザーがデイリーコンディションを保存または編集した後にレコメンドを再計算する
- 読み取り・書き込み・派生ビュー状態のオーケストレーションのみを行う
- リポジトリ呼び出しの前に `toDayKey(...)` を通じて選択された日付を変換する
- `seedTodayState` ヘルパーはプロダクションファイルを作成せずに `today-screen.test.tsx` のローカルとして保つ

- [ ] **ステップ 4: デイリーコンディションカードを実装する**

3つの大きなボタンをレンダリングする:
- `Feeling good`
- `Okay`
- `Tired`

オプションのノートテキストエリアと1つの明示的な `Save condition` ボタンを含める。ユーザーが同日後に戻ってきたとき、保存されたコンディションとノートを事前入力する。

- [ ] **ステップ 5: 共有ログ記録アクションコンポーネントを追加する**

`Today` と演习の詳細で同じ `Did it`、`Partly`、`Couldn't` コントロールと成功状態メッセージを再利用するために `src\features\logging\components\exercise-log-actions.tsx` を作成する。

- [ ] **ステップ 6: レコメンドエクササイズカードを実装する**

各カードには以下を表示する:
- タイトル
- 短い説明
- 時間
- 強度
- `Watch`（視聴）
- `Did it`（できた）
- `Partly`（少しできた）
- `Couldn't`（できなかった）

コンポーネントはコールバックのみを発行する。

動作ルール:
- `Watch` は `/exercises/${exerciseId}` に遷移する
- `/library` への明確なセカンダリリンクを含める
- カードのログが既に存在する場合、レンダリング直後に現在の保存された結果状態を表示する
- `TodayScreen` はレコメンドリストの上に現在の日付を明確に表示する
- `use-today-data.ts` はリポジトリの読み書きを行い、ログ記録やコンディション保存後に派生ビュー状態を更新する

- [ ] **ステップ 7: Today ページルートを統合する**

`src\app\page.tsx` を薄く保つ: クライアント Today スクリーンをレンダリングし、`date={toDayKey(new Date())}` を渡し、ルートファイルへの直接 IndexedDB アクセスを避ける。

- [ ] **ステップ 8: Today テスト、リント、ビルドを実行する**

実行: `npm run test -- src\app\page.test.tsx src\features\today\today-screen.test.tsx src\features\logging\exercise-log-actions.test.tsx src\features\storage\storage.test.ts && npm run lint && npm run build`  
期待:
- フォーカスされたテストが PASS
- リントが通る
- ビルドが通る

- [ ] **ステップ 9: コミット**

```bash
git add src\app\page.tsx src\app\page.test.tsx src\features\logging src\features\today
git commit -m "feat: add today screen logging flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## チャンク 3: ライブラリ、履歴、PWA の完成

### タスク 5: ライブラリブラウズとエクササイズ詳細フローの追加

**ファイル:**
- 作成: `src\features\library\components\library-filters.tsx`
- 作成: `src\features\library\components\library-screen.tsx`
- 作成: `src\features\library\components\exercise-detail-screen.tsx`
- 作成: `src\features\library\library-screen.test.tsx`
- 作成: `src\app\exercises\[exerciseId]\page.tsx`
- 作成: `src\app\exercises\[exerciseId]\page.test.tsx`
- 変更: `src\app\library\page.tsx`
- 変更: `src\features\logging\components\exercise-log-actions.tsx`

- [ ] **ステップ 1: 失敗するライブラリテストを書く**

```tsx
test("身体部位と時間でエクササイズライブラリをフィルタリングする", async () => {
  render(<LibraryScreen />);

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.selectOptions(screen.getByLabelText(/duration/i), "5");

  expect(screen.getAllByRole("article")).toHaveLength(1);
});
```

```tsx
test("目的と強度でエクササイズライブラリをフィルタリングする", async () => {
  render(<LibraryScreen />);

  await user.selectOptions(screen.getByLabelText(/purpose/i), "mobility");
  await user.selectOptions(screen.getByLabelText(/intensity/i), "low");

  expect(screen.getAllByRole("article")).toHaveLength(1);
});
```

```tsx
test("ライブラリでシンプルなテスト検索をサポートする", async () => {
  render(<LibraryScreen />);

  await user.type(screen.getByLabelText(/search exercises/i), "neck");
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});
```

```tsx
test("ライブラリカードがエクササイズ詳細ルートにリンクする", async () => {
  render(<LibraryScreen />);

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/exercises/neck-mobility-5");
});
```

```tsx
test("エクササイズ詳細ページが動画・メタデータ・ログ記録アクションを表示する", () => {
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  expect(screen.getByRole("link", { name: /watch video/i })).toHaveAttribute("href", expect.stringContaining("youtube"));
  expect(screen.getByText(/gentle seated mobility work/i)).toBeInTheDocument();
  expect(screen.getByText(/mobility/i)).toBeInTheDocument();
  expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /did it/i, exact: false })).toBeInTheDocument();
});
```

```tsx
test("エクササイズ詳細のログ記録が選択した結果を永続化する", async () => {
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  await user.click(screen.getByRole("button", { name: /did it/i, exact: false }));
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("エクササイズ詳細が初回レンダリング時に既存のログ状態を補完する", async () => {
  await seedTodayState();
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

- [ ] **ステップ 2: テストを実行して失敗することを確認する**

実行: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`  
期待: ライブラリスクリーンと詳細ルートが存在しないため FAIL

- [ ] **ステップ 3: ライブラリフィルタコントロールを実装する**

以下のモバイルフレンドリーなフィルタを追加する:
- 身体部位
- 目的
- 時間
- 強度

`library-filters.tsx` はフィルタコントロールのみの責務を持つようにする。

- [ ] **ステップ 4: ライブラリスクリーン結果コンポジションを実装する**

フィルタリングされた結果セットのコンポジションを `library-screen.tsx` に持たせる。

`Search exercises` とラベル付けされた1つのプレーンランゲージ検索フィールドを追加する。

検索マッチングルール:
- エクササイズ `title` にマッチ
- エクササイズ `description` にマッチ
- 非表示/内部 ID にはマッチしない

- [ ] **ステップ 5: エクササイズ詳細スクリーンと薄いルートを実装する**

クライアント/詳細 UI 用に `src\features\library\components\exercise-detail-screen.tsx` を作成する。

`src\app\exercises\[exerciseId]\page.tsx` を薄く保つ:
- バンドル済みカタログからエクササイズを読み込む
- ルートパラメータを静的生成する
- 選択されたエクササイズをフィーチャーコンポーネントに渡す
- ルートファイルにクライアント UI ロジックを埋め込まない

- [ ] **ステップ 6: ライブラリと詳細テストを実行する**

実行: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\today\today-screen.test.tsx`  
期待: PASS

- [ ] **ステップ 7: コミット**

```bash
git add src\app\library src\app\exercises src\features\library src\features\logging
git commit -m "feat: add library browsing and exercise details" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### タスク 6: 履歴カレンダーと日次サマリーレビューの追加

**ファイル:**
- 作成: `src\lib\date\month-grid.ts`
- 作成: `src\features\history\history-query.ts`
- 作成: `src\features\history\components\history-calendar.tsx`
- 作成: `src\features\history\components\day-summary.tsx`
- 作成: `src\features\history\components\history-screen.tsx`
- 作成: `src\features\history\history-screen.test.tsx`
- 変更: `src\app\history\page.tsx`

- [ ] **ステップ 1: 失敗する履歴テストを書く**

```tsx
test("エクササイズログがある日をカレンダーにマークし、選択した日のサマリーを表示する", async () => {
  await seedLogsForHistory();
  render(<HistoryScreen month="2026-03" />);

  expect(screen.getByRole("button", { name: /march 23, completed/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /march 23, completed/i }));
  expect(await screen.findByText(/neck mobility/i)).toBeInTheDocument();
  expect(await screen.findByText(/did it/i)).toBeInTheDocument();
  expect(await screen.findByText(/tired/i)).toBeInTheDocument();
  expect(await screen.findByText(/legs feel heavy/i)).toBeInTheDocument();
});
```

`seedLogsForHistory` は `src\features\history\history-screen.test.tsx` のローカルとして保つ。

- [ ] **ステップ 2: 履歴テストを実行して失敗することを確認する**

実行: `npm run test -- src\features\history\history-screen.test.tsx`  
期待: カレンダーとサマリーコンポーネントが存在しないため FAIL

- [ ] **ステップ 3: 月グリッドヘルパーを実装する**

安定した6行カレンダーグリッドを生成するために `month-grid.ts` を使用する。

- [ ] **ステップ 4: 履歴クエリヘルパーを実装する**

以下を収集するために `history-query.ts` を使用する:
- 月レベルの完了日マーカー
- 選択された日のログ
- 選択された日のコンディションとノート

- [ ] **ステップ 5: 履歴スクリーンを実装する**

`history-query.ts` を利用して、完了した日を可視状態とアクセシブルなラベルでレンダリングする。

- [ ] **ステップ 6: 日次サマリーパネルを実装する**

以下を表示する:
- ログ記録されたエクササイズ
- 結果チップ
- デイリーコンディションエントリ
- デイリーノート（存在する場合）

Dexie アクセスはページコンポーネントに直接置かず、`history-query.ts` とリポジトリ/ヘルパーの中に保つ。

- [ ] **ステップ 7: 履歴とストレージテストを実行する**

実行: `npm run test -- src\features\history\history-screen.test.tsx src\features\storage\storage.test.ts`  
期待: PASS

- [ ] **ステップ 8: コミット**

```bash
git add src\lib\date\month-grid.ts src\app\history\page.tsx src\features\history
git commit -m "feat: add history calendar review" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### タスク 7: PWA 動作・オフライン必須機能・最終検証の完了

**ファイル:**
- 作成: `public\manifest.webmanifest`
- 作成: `public\icons\icon-192.png`
- 作成: `public\icons\icon-512.png`
- 作成: `src\app\icon.svg`
- 変更: `next.config.ts`
- 変更: `src\app\layout.tsx`
- テスト: `src\app\page.test.tsx`

- [ ] **ステップ 1: 失敗するメタデータテストを書く**

```tsx
import { metadata } from "./layout";

test("レイアウトにインストール可能なアプリのメタデータが含まれている", () => {
  expect(metadata.applicationName).toBe("Exercise Log");
  expect(metadata.manifest).toBe("/manifest.webmanifest");
});
```

- [ ] **ステップ 2: メタデータテストを実行して失敗することを確認する**

実行: `npm run test -- src\app\page.test.tsx`  
期待: マニフェストとメタデータが設定されるまで FAIL

- [ ] **ステップ 3: PWA アイコンアセットを作成する**

以下を作成する:
- `public\icons\icon-192.png`
- `public\icons\icon-512.png`
- `src\app\icon.svg`

マニフェストの `icons` エントリが実際のファイルを指すように、シンプルなブランドアプリアイコンを使用する。

- [ ] **ステップ 4: マニフェストとレイアウトメタデータを追加する**

以下を設定する:
- `manifest.webmanifest`
- `layout.tsx` のアプリ名とテーマメタデータ

最低限のマニフェストフィールド:

```json
{
  "name": "Exercise Log",
  "short_name": "Exercise Log",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **ステップ 5: `next-pwa` 統合を追加する**

エクスポートされたアプリがキャッシュされた静的アセット用のサービスワーカーを出力するよう、`next.config.ts` で `next-pwa` をワイヤリングする。

- [ ] **ステップ 6: ビルドされた PWA アーティファクトが出力されることを確認する**

実行: `npm run build`  
期待:
- ビルドが PASS
- `out\manifest.webmanifest` が存在する
- `/`、`/library`、`/history` の静的ファイルが `out\` 以下に存在する
- `out\exercises\neck-mobility-5\index.html` が存在する
- `out\sw.js` などの next-pwa サービスワーカー出力が存在する

- [ ] **ステップ 7: 完全な検証スイートを実行する**

実行: `npm run test && npm run lint && npm run build`  
期待: すべてのコマンドが PASS し、静的エクスポートが正常に完了する

- [ ] **ステップ 8: オフラインとインストール可能性の動作をスモークチェックする**

実行: `npx serve out`  
期待:
- `serve` がまだ利用可能でない場合、`npx` は起動前にインストールする
- ビルドされたアプリがローカルに読み込まれる
- `Today`、`Library`、`History` ルートがレンダリングされる
- ブラウザの DevTools `Application > Manifest` で、インストール可能性がアイコン/マニフェストのブロックエラーを表示しない
- `Application > Service Workers` でサービスワーカーが登録されてアクティブである
- `/`、`/library`、`/history` を一度ロードした後、ブラウザをオフラインに切り替えてそれらの訪問済みルートを更新してもコンテンツがレンダリングされる
- 以前に保存された IndexedDB データがブラウザに表示される

- [ ] **ステップ 9: コミット**

```bash
git add next.config.ts public\manifest.webmanifest src\app\layout.tsx src\app\icon.svg
git commit -m "feat: finish pwa setup and verification" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## 最終検証チェックリスト

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] モバイル幅ビューポートで `Today`、`Library`、`History` ナビゲーションを確認
- [ ] デイリーコンディションエントリがリロード後に編集・再読み取りできることを確認
- [ ] エクササイズログの状態がリロード後も永続することを確認
- [ ] 履歴カレンダーが完了した日を正確に表示することを確認
- [ ] サポートされているブラウザでアプリが PWA としてインストールできることを確認
