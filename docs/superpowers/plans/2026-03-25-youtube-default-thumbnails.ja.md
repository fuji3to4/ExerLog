# YouTube デフォルトサムネイル対応 実装計画

> **エージェント向け注記:** 必須サブスキル: このプランをタスクごとに実装する際は superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使用してください。ステップはチェックボックス（`- [ ]`）構文で進捗を追跡します。

**目標:** エクササイズに YouTube URL があってカスタムサムネイルがない場合に YouTube のデフォルトサムネイルを自動的に使用しながら、再生は軽量な外部リンクとして保ち、YouTube 以外の動画はシンプルなテキストのみのカードとして保つ。

**アーキテクチャ:** YouTube の動画 ID を抽出してデフォルトのサムネイル URL を解決するための共有 URL ヘルパーを1つ追加する。そのヘルパーをフォームプレビューと UI レンダリングで再利用するが、明示的なカスタムサムネイルのみを永続化する。空の `thumbnailUrl` は「可能であればレンダリング時に YouTube から導出する」ことを意味する。これにより、ユーザーが後で `videoUrl` を変更したときに古い保存済みサムネイルを避けられ、データベースのマイグレーションなしに既存の保存済みレコードが動作し続ける。

**技術スタック:** Next.js App Router、React 19、TypeScript、Vitest、React Testing Library、Dexie、GitHub Pages への静的エクスポート

---

## ファイル構成

### 共有サムネイル解決

- 作成: `src\lib\video\youtube.ts` — YouTube URL の解析、動画 ID の抽出、デフォルトサムネイル URL の構築、エクササイズレコードの単一サムネイルリゾルバーの公開。
- 作成: `src\lib\video\youtube.test.ts` — サポートされる YouTube URL フォーマット、無効な URL、カスタムサムネイル優先のフォーカスされたユニットカバレッジ。

### エクササイズ入力とインポートフロー

- 変更: `src\features\settings\components\exercise-form-modal.tsx` — フィールドが空のときに導出された YouTube サムネイルをプレビューし、ユーザーがカスタムサムネイルを入力しない限り空の状態を保存する。
- 作成: `src\features\settings\exercise-form-modal.test.tsx` — YouTube URL の導出プレビュー・手動サムネイルの保存・YouTube 以外の URL に対して画像がないことを確認する。

### エクササイズ表示

- 変更: `src\features\today\components\recommended-exercise-card.tsx` — 解決されたサムネイル URL が存在する場合、既存のカードコンテンツの上または隣にサムネイルプレビューをレンダリングする。
- 変更: `src\features\today\recommended-exercise-card.test.tsx` — カードが正しくリンクされ、既存の視聴 CTA 動作を変えずに解決されたサムネイルをレンダリングすることを確認する。
- 変更: `src\features\library\components\library-screen.tsx` — Today カードと同じ共有リゾルバーを使用してライブラリルートのカードマークアップにサムネイルレンダリングを追加する。
- 変更: `src\features\library\library-screen.test.tsx` — ライブラリルートが保存された `thumbnailUrl` が空の YouTube エクササイズの共有サムネイルフォールバックを表示することを確認する。
- 変更: `src\features\library\components\exercise-detail-screen.tsx` — 埋め込み再生の代わりに外部視聴ボタンを保ちながら、詳細ヘッダーに解決されたサムネイルをレンダリングする。
- 変更: `src\app\exercises\[exerciseId]\page.test.tsx` — 詳細ページが YouTube バックドエクササイズのサムネイルを表示し、外部動画アクションを保持することを確認する。
- 変更: `src\app\globals.css` — サムネイルがない場合の現在のテキストのみのフォールバックを変えずに、カードと詳細ビューのサムネイルレイアウトとレスポンシブ画像スタイルを追加する。

### オプションの UI コピーの改善

- 変更: `src\features\i18n\messages\en.ts` — 実装で新しい可視フォームガイダンスが導入される場合のみヘルパーテキストを追加する。
- 変更: `src\features\i18n\messages\ja.ts` — 実装で新しい可視フォームガイダンスが導入される場合のみ対応する日本語ヘルパーテキストを追加する。

---

## タスク 1: 共有 YouTube サムネイルリゾルバーの構築

**ファイル:**
- 作成: `src\lib\video\youtube.ts`
- 作成: `src\lib\video\youtube.test.ts`
- 確認: `src\lib\types.ts`

- [ ] **ステップ 1: 失敗するリゾルバーテストを書く**

```ts
import { describe, expect, test } from "vitest";

import { getYouTubeThumbnailUrl, getYouTubeVideoId, resolveExerciseThumbnailUrl } from "./youtube";

describe("getYouTubeVideoId", () => {
  test("標準ウォッチ URL を読み取る", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("短い youtu.be URL を読み取る", () => {
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("YouTube 以外の URL に対して null を返す", () => {
    expect(getYouTubeVideoId("https://example.com/video.mp4")).toBeNull();
  });
});

test("導出された YouTube サムネイルよりカスタムサムネイルを優先する", () => {
  expect(
    resolveExerciseThumbnailUrl({
      id: "1",
      title: "Test",
      description: "",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://cdn.example.com/custom.jpg",
      bodyArea: "upper-body",
      purpose: "mobility",
      durationMinutes: 5,
      intensity: "low",
    }),
  ).toBe("https://cdn.example.com/custom.jpg");
});
```

- [ ] **ステップ 2: フォーカスされたヘルパーテストを実行する**

実行: `npm run test -- src\lib\video\youtube.test.ts`  
期待: ヘルパーモジュールがまだ存在しないため FAIL

- [ ] **ステップ 3: 最小限のリゾルバーを実装する**

```ts
import type { ExerciseVideo } from "@/lib/types";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const match = url.pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
    return match?.[2] ?? null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function resolveExerciseThumbnailUrl(exercise: Pick<ExerciseVideo, "videoUrl" | "thumbnailUrl">): string | null {
  return exercise.thumbnailUrl.trim() || getYouTubeThumbnailUrl(exercise.videoUrl);
}
```

- [ ] **ステップ 4: ヘルパーテストを再実行する**

実行: `npm run test -- src\lib\video\youtube.test.ts`  
期待: PASS

- [ ] **ステップ 5: 共有リゾルバーをコミットする**

```bash
git add src/lib/video/youtube.ts src/lib/video/youtube.test.ts
git commit -m "feat: add youtube thumbnail resolver"
```

---

## タスク 2: 永続化せずにフォームで導出されたサムネイルをプレビューする

**ファイル:**
- 変更: `src\features\settings\components\exercise-form-modal.tsx`
- 作成: `src\features\settings\exercise-form-modal.test.tsx`
- 確認: `src\features\settings\components\exercise-form-modal.tsx`

- [ ] **ステップ 1: 失敗するフォームテストを書く**

```tsx
test("動画 URL が YouTube リンクでフィールドが空のときに導出されたサムネイルプレビューを表示する", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://youtu.be/dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("手動サムネイルを保持して導出されたプレビューの代わりにその画像を表示する", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/thumbnail/i), "https://cdn.example.com/manual.jpg");
  await user.type(screen.getByLabelText(/video url/i), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("https://cdn.example.com/manual.jpg");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://cdn.example.com/manual.jpg",
  );
});

test("サムネイルフィールドが空のときに YouTube 以外の URL のプレビューを表示しない", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://example.com/video.mp4");

  expect(screen.queryByRole("img", { name: /thumbnail preview/i })).not.toBeInTheDocument();
});
```

- [ ] **ステップ 2: フォーカスされたフォームテストを実行する**

実行: `npm run test -- src\features\settings\exercise-form-modal.test.tsx`  
期待: フォームがまだ導出されたプレビューを表示しないため FAIL

- [ ] **ステップ 3: 最小限の導出プレビュー動作を実装する**

```tsx
const resolvedThumbnailUrl = form.thumbnailUrl.trim() || getYouTubeThumbnailUrl(form.videoUrl) || "";
const shouldShowThumbnailPreview = resolvedThumbnailUrl.length > 0;

{shouldShowThumbnailPreview ? (
  <div className="exercise-form-modal__thumbnail-preview">
    <img src={resolvedThumbnailUrl} alt={t("settings_form_thumbnail_preview_alt")} />
  </div>
) : null}
```

`handleSubmit` は `form.thumbnailUrl.trim()` のみを保存するよう変更しない。URL が YouTube でなくフィールドが空の場合、プレビューを表示しない。このタスクに埋め込みロジックを追加しない。

- [ ] **ステップ 4: フォーカスされたフォームテストを再実行する**

実行: `npm run test -- src\features\settings\exercise-form-modal.test.tsx`  
期待: PASS

- [ ] **ステップ 5: フォームプレビューの変更をコミットする**

```bash
git add src/features/settings/components/exercise-form-modal.tsx src/features/settings/exercise-form-modal.test.tsx
git commit -m "feat: preview derived youtube thumbnails in exercise form"
```

---

## タスク 3: カードと詳細ビューにグレースフルフォールバックでサムネイルをレンダリングする

**ファイル:**
- 変更: `src\features\today\components\recommended-exercise-card.tsx`
- 変更: `src\features\today\recommended-exercise-card.test.tsx`
- 変更: `src\features\library\components\library-screen.tsx`
- 変更: `src\features\library\library-screen.test.tsx`
- 変更: `src\features\library\components\exercise-detail-screen.tsx`
- 変更: `src\app\exercises\[exerciseId]\page.test.tsx`
- 変更: `src\app\globals.css`

- [ ] **ステップ 1: 失敗する表示テストを書く**

```tsx
const exercise = {
  id: "blank-youtube-thumb",
  title: "Blank Thumbnail Exercise",
  description: "",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationMinutes: 5,
  intensity: "low",
} as const;

test("保存されたサムネイルがない YouTube エクササイズのときに導出されたサムネイル画像をレンダリングする", () => {
  renderWithLanguage(
    <RecommendedExerciseCard exercise={exercise} result={null} watchHref="/watch" onLog={vi.fn()} />,
  );

  expect(screen.getByRole("img", { name: /blank thumbnail exercise/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});
```

```tsx
test("ライブラリが空のサムネイル YouTube エクササイズの共有サムネイルフォールバックを表示する", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
});

test("エクササイズ詳細ページが導出されたサムネイルを表示して外部視聴アクションを保持する", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "blank-youtube-thumb" }) }));

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /動画を見る/i })).toHaveAttribute(
    "href",
    expect.stringContaining("youtube"),
  );
});
```

- [ ] **ステップ 2: フォーカスされた表示テストを実行する**

実行: `npm run test -- src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
期待: カード・ライブラリルート・詳細ビューのいずれも導出されたサムネイル画像をまだレンダリングしないため FAIL

- [ ] **ステップ 3: 最小限のサムネイルレンダリングを実装する**

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

return (
  <article className="card recommendation-card" aria-labelledby={headingId}>
    {thumbnailUrl ? (
      <div className="recommendation-card__thumbnail">
        <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
      </div>
    ) : null}
    ...
  </article>
);
```

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

return (
  <article key={exercise.id} className="card recommendation-card" aria-labelledby={headingId}>
    {thumbnailUrl ? (
      <div className="recommendation-card__thumbnail">
        <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
      </div>
    ) : null}
    ...
  </article>
);
```

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

{thumbnailUrl ? (
  <div className="exercise-detail__thumbnail">
    <img src={thumbnailUrl} alt={exercise.title} />
  </div>
) : null}
```

```css
.recommendation-card__thumbnail img,
.exercise-detail__thumbnail img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 1rem;
  object-fit: cover;
}
```

`resolveExerciseThumbnailUrl` が `null` を返す場合、現在のテキストのみのレイアウトを保つ。プレーヤーを埋め込まない。

- [ ] **ステップ 4: フォーカスされた表示テストを再実行する**

実行: `npm run test -- src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
期待: PASS

- [ ] **ステップ 5: 表示の更新をコミットする**

```bash
git add src/features/today/components/recommended-exercise-card.tsx src/features/today/recommended-exercise-card.test.tsx src/features/library/components/library-screen.tsx src/features/library/library-screen.test.tsx src/features/library/components/exercise-detail-screen.tsx src/app/exercises/[exerciseId]/page.test.tsx src/app/globals.css
git commit -m "feat: show youtube thumbnails in exercise views"
```

---

## タスク 4: リグレッションチェックの実行と変更の最終化

**ファイル:**
- 変更: `src\features\i18n\messages\en.ts`（新しいヘルパーコピーが追加された場合のみ）
- 変更: `src\features\i18n\messages\ja.ts`（新しいヘルパーコピーが追加された場合のみ）
- 確認: `package.json`

- [ ] **ステップ 1: 必要なローカライズされたヘルパーテキストを追加する**

```ts
settings_form_thumbnail_url_hint: "Leave blank to auto-use the YouTube thumbnail when possible",
settings_form_thumbnail_preview_alt: "Thumbnail preview",
```

```ts
settings_form_thumbnail_url_hint: "空欄の場合は、可能ならYouTubeのサムネイルを自動利用します",
settings_form_thumbnail_preview_alt: "サムネイルのプレビュー",
```

フォームがプレビュー画像をレンダリングする場合は `settings_form_thumbnail_preview_alt` を追加する。実装で可視ヘルパーテキストが導入される場合のみヒントキーを追加する。

- [ ] **ステップ 2: ターゲットを絞ったリグレッションスイートを実行する**

実行: `npm run test -- src\lib\video\youtube.test.ts src\features\settings\exercise-form-modal.test.tsx src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
期待: PASS

- [ ] **ステップ 3: リポジトリ検証コマンドを実行する**

実行: `npm run test && npm run lint && npm run build`  
期待: PASS

- [ ] **ステップ 4: リグレッションセーフな完了をコミットする**

```bash
git add src/features/i18n/messages/en.ts src/features/i18n/messages/ja.ts
git commit -m "test: cover youtube thumbnail fallback flow"
```

このタスクで変更されなかったファイルの `git add` エントリはスキップする。
