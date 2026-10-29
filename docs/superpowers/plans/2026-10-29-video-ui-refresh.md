# 動画まわりの見た目の見直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 動画カードを YouTube 風にそろえ、ライブラリ上部（セットの列＋開閉する絞り込み）、「今日」のおすすめ部分、動画の詳細ページをすっきりさせる。

**Architecture:** 共通の `VideoCard`（サムネイル＋時間の札＋太字タイトル＋灰色1行＋⋮＋任意のフッター）と、共通の `SetSwitcher`（ボタンの列）を作り、ライブラリと「今日」の両方で使う。`ExerciseSetMenu` に「⋮」アイコンと「＋ セット」ボタンの2つの見た目を持たせ、カードと詳細ページで使う。動き（絞り込み・おすすめ・セット）は変えない。

**Tech Stack:** Next.js 15 / React 19、Tailwind ＋ `src/app/globals.css`、Radix DropdownMenu、lucide-react、Vitest 3 + Testing Library。

**Spec:** `docs/superpowers/specs/2026-10-29-video-ui-refresh-design.md`

## Global Constraints

- 色・角丸・フォントは `globals.css` のテーマ変数（`hsl(var(--primary))` など）だけを使う。どのテーマでも崩れないこと。色を直接書かない（時間の札の黒い半透明 `rgb(0 0 0 / 0.78)` と白文字は例外）。
- 下から出るシート（`components/ui/sheet.tsx`）は使わない。
- リンクの中にボタンやリンクを入れ子にしない。
- 動画を開くリンクのアクセシブルな名前は `action_watch_aria`（「{title}を見る」/ "Watch {title}"）のまま。1枚のカードでこの名前を持つリンクは1つだけ（サムネイル側のリンクは `aria-hidden="true"` かつ `tabIndex={-1}`）。
- 絞り込み・並べ替え・おすすめ・セットの動き（組み合わせ、追加順、消えたセットで「すべて」に戻る、日ごとに固定、入れ替え）は変えない。
- 狭い幅（スマホ）と広い幅（PC の複数列グリッド）の両方で崩れない。ライブラリの複数列グリッドは残す。
- 文言は ja / en 両方。使われなくなったキーは両方から消す。
- なくなる部品を直接探している既存テストは書き直してよい。ただし確かめていた動きは残す。テストのためだけに隠した部品を残さない。

## Review Focus

- 長いタイトル・長い説明文 → 2行（説明は1〜2行）で省略され、カードの高さがそろう。（Task 1 で `line-clamp` クラスの付与をテスト）
- 絞り込みパネルを閉じても選んだ条件は残り、ボタンの数表示と一覧に効いたまま。（Task 2 にテスト）
- サムネイルのない動画 → カードが崩れず、タイトルのリンクから開ける。（Task 1 にテスト）
- 「今日」のセット表示中に⋮でそのセットから外す → カードがその場で消え、エラーにならない。（Task 3 にテスト）
- 詳細ページで「＋ セット」から新しいセットを作る → セットが作られ、その動画が入る。（Task 4 にテスト）

---

## File Structure

- Create `src/features/library/components/video-card.tsx`：ライブラリと「今日」共通のカード。
- Create `src/features/exercise-sets/components/set-switcher.tsx`：セットのボタンの列（ライブラリと「今日」）。
- Modify `src/features/exercise-sets/components/exercise-set-menu.tsx`：`variant` を追加し、アイコンを ⋮ に変える。
- Modify `src/features/library/components/library-screen.tsx`, `library-filters.tsx`
- Modify `src/features/today/components/today-screen.tsx`, `recommended-exercise-card.tsx`, `src/features/today/use-today-data.ts`
- Modify `src/features/library/components/exercise-detail-screen.tsx`
- Modify `src/features/logging/components/exercise-log-actions.tsx`（見た目のみ）
- Modify `src/app/globals.css`, `src/features/i18n/messages/ja.ts`, `en.ts`

---

### Task 1: 共通の VideoCard と、ライブラリのカード

**Files:**
- Create: `src/features/library/components/video-card.tsx`
- Modify: `src/features/exercise-sets/components/exercise-set-menu.tsx`
- Modify: `src/features/library/components/library-screen.tsx`（カードの描画部分）
- Modify: `src/app/globals.css`, `messages/ja.ts`, `messages/en.ts`
- Test: `src/features/library/components/video-card.test.tsx`（新規）, `src/features/library/library-screen.test.tsx`, `src/features/library/library-edit-mode.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type VideoCardProps = {
    exercise: ExerciseVideo;
    href: string;
    headingLevel: 2 | 3;
    meta: string[];            // 灰色1行に " · " でつなぐ。空要素は出さない
    eyebrow?: string;          // タイトル上の小さな色文字（「今日」の役割）
    menu?: ReactNode;          // タイトル行の右（⋮）
    children?: ReactNode;      // カード下部（記録ボタン、編集ボタン）
  };
  export function VideoCard(props: VideoCardProps): JSX.Element
  ```
  - `ExerciseSetMenu` に `variant?: "icon" | "button"` を足す（既定 `"icon"`）。
    - `"icon"` は lucide `EllipsisVertical`（⋮）。aria-label は今の `set_menu_aria`。
    - `"button"` は Plus アイコン＋`set_menu_button` の丸いボタン。
    - その他の動きは今のまま。
- 構造：
  - ルートは `role="article"`、`aria-labelledby` は見出し id。
  - サムネイルのリンク（`aria-hidden`, `tabIndex={-1}`）と、見出しの中のタイトルのリンク（aria-label `action_watch_aria`）。
  - 時間の札はサムネイルの右下に置く（`formatDuration`）。サムネイルがないときは、時間を `meta` の先頭に入れるのは呼ぶ側の責任ではなく、`VideoCard` が札の代わりに灰色1行の先頭に出す。
  - タイトルは `line-clamp-2`、説明は `line-clamp-2`。

- [ ] **Step 1: 失敗するテストを書く**

`video-card.test.tsx`（en、`renderWithLanguage`）:
- `"links thumbnail and title to the video with a single accessible watch link"`：`getAllByRole("link", { name: "Watch Neck Mobility" })` が長さ 1。`href` が渡した値と一致する。
- `"shows the duration badge and a single meta line"`：`meta={["High", "Lower body", "Strength"]}` → `"High · Lower body · Strength"` が見える。サムネイル上に `"1:00"` が見える。
- `"clamps long titles and descriptions"`：見出しのリンクに `line-clamp-2` クラスがあり、説明の要素にも `line-clamp-2` がある。
- `"renders without a thumbnail"`：`thumbnailUrl` も `videoUrl` も空のとき、`img` がなく、タイトルのリンクがあり、`"1:00"` が灰色1行の先頭に出る。
- `"renders eyebrow, menu and footer slots"`：`eyebrow="New"`、`menu={<button>m</button>}`、`children={<button>f</button>}` が全部出る。

`library-screen.test.tsx`:
- `"Watched: 3"` の検証は、灰色1行の `"Watched 3 times"` に書き直す。
- 「見る」ボタンのテキストがないことも確認する（`queryByText("Watch")` が null）。

- [ ] **Step 2: Run `npx vitest run src/features/library` → FAIL**

- [ ] **Step 3: 実装する**
  - **ライブラリのカード:** `VideoCard` を使う。`headingLevel={2}` にし、`meta` は `[強度 {formatIntensity}, formatBodyArea, formatPurpose, 視聴回数>0 ? library_watch_count : ""]` にする。`menu` は `ExerciseSetMenu`。編集モードのときは、`children` に今の編集・削除ボタンを入れる。
  - **CSS:**
    - `.video-card*` を新しく作る。今の `recommendation-card*` のうち、ライブラリで使わなくなるものは消す（「今日」は Task 3 で移行するので、それまで残す）。
    - カードは枠や背景を薄くし、サムネイルは角丸、文字は余白を詰める。
  - **i18n:**

    | キー | ja | en |
    |---|---|---|
    | `library_watch_count` | `視聴 {count}回` | `Watched {count} times` |
    | `set_menu_button` | `セット` | `Set` |
    | `meta_intensity_value` | `強度 {value}` | `{value} intensity` |

- [ ] **Step 4: Run `npx vitest run src/features/library src/features/today` → PASS**（「今日」はまだ旧カード。壊していないことの確認）

- [ ] **Step 5: コミット** `feat(library): YouTube-style video cards`

---

### Task 2: ライブラリの上の部分（セットの列・開閉する絞り込み・件数）

**Files:**
- Create: `src/features/exercise-sets/components/set-switcher.tsx`
- Modify: `src/features/library/components/library-filters.tsx`, `library-screen.tsx`
- Modify: `globals.css`, `messages/ja.ts`, `en.ts`
- Test: `src/features/library/library-screen.test.tsx`, `src/features/exercise-sets/components/set-switcher.test.tsx`（新規）

**Interfaces:**
- Consumes: Task 1 の `VideoCard`（変更なし）
- Produces:
  ```ts
  type SetSwitcherProps = {
    ariaLabel: string;
    allLabel: string;                 // 先頭ボタンの文言
    sets: ExerciseSet[];
    selectedId: string | null;        // null = 先頭
    onSelect(id: string | null): void;
    trailing?: ReactNode;             // 列の最後（ライブラリの「⋯」）
  };
  export function SetSwitcher(props: SetSwitcherProps): JSX.Element | null  // sets が空なら null
  ```
  - 中身は `role="group"` と `<button aria-pressed>`。CSS は今の `.today-screen__source-*` を `.set-switcher*` に名前を変えて移す。
  - `LibraryFilters` から `set` の select と説明文を外す。props は `{ value, onChange, isOpen }`。部位・目的・強度・時間の4つだけを描く。
  - 開閉は `library-screen.tsx` が持つ。

- [ ] **Step 1: 失敗するテストを書く**

`set-switcher.test.tsx`:
- セットが空なら何も描かない。
- 押すと `onSelect` に id（先頭なら `null`）が渡る。
- 選んでいるボタンは `aria-pressed="true"`。

`library-screen.test.tsx`（既存のセット・絞り込みのテストを新しい UI に書き直し、次を足す）:
- `"set row filters the list and is hidden when there are no sets"`
  - セットがないとき、`queryByRole("group", { name: "Sets" })` は null。
  - セットを作ったあとは `button` "Morning" を押すと、そのセットの動画だけが追加順に並ぶ。
- `"set actions live at the end of the set row"`
  - "All" を選んでいるときは "Set actions" がない。
  - Morning を選ぶと "Set actions" が出て、"Rename" と "Delete this set" が今と同じ動きをする（今のテストの手順を流用する）。
  - 削除すると "All" が `aria-pressed="true"` に戻る。
- `"filters panel opens and closes, keeping choices and showing the count"`
  - 最初は "Body area" の入力がない。
  - `button` "Filters" を押すと現れ、"upper-body" を選ぶ。
  - もう一度押して閉じても、ボタン名は "Filters 1" になり、一覧は絞られたまま。
- `"count line shows shown / total and the set size"`
  - 何もしないとき：`` `${exerciseCatalog.length} videos` ``（テストが入れた件数）。
  - 検索で絞ったとき：`` `${shown} / ${exerciseCatalog.length} videos` ``。
  - Morning（4本、うち2本が条件に合う）を選んで絞ったとき：`"Morning: 2 / 4 videos"`。
- 並び順の select（label "Sort"）は件数の行にあり、"most-watched" を選ぶと今と同じ並びになる。

- [ ] **Step 2: Run `npx vitest run src/features/library src/features/exercise-sets` → FAIL**

- [ ] **Step 3: 実装する**
  - **ページの上部:**
    - 見出しと「編集」スイッチだけにする（`library_subheading` を削除）。
    - その下に `SetSwitcher`（ariaLabel `library_sets_aria`、allLabel `library_set_all`）。`trailing` は、セット選択中だけ今の「Set actions」メニューを出す。
  - **検索の行:**
    - 検索欄（今の `search` 入力。label は `library_search_label` を視覚的に隠して残す）と、その右の「絞り込み」ボタン（`aria-expanded`）を並べる。
    - 4つのうち選んでいる数を n として、n>0 なら `library_filters_toggle_count`、そうでなければ `library_filters_toggle` を出す。
    - 開いているときだけ、すぐ下に `LibraryFilters` を描く。
  - **件数の行:** 左に件数、右に並び順の小さな select（label は `library_sort_label` を視覚的に隠す）を置く。件数の文言は次の表のとおり。
  - **i18n:**
    - 次の表のキーを追加・変更する。
    - `library_result_count`、`library_subheading`、`library_filters_heading`、`library_filters_subheading` は削除する。
    - `library_set_label` は使われなくなったら削除する。

    | キー | ja | en |
    |---|---|---|
    | `library_sets_aria` | `セット` | `Sets` |
    | `library_filters_toggle` | `絞り込み` | `Filters` |
    | `library_filters_toggle_count` | `絞り込み {count}` | `Filters {count}` |
    | `library_count_all` | `{total}件` | `{total} videos` |
    | `library_count_filtered` | `{shown}件 / {total}件` | `{shown} / {total} videos` |
    | `library_set_count` | `{name}：{count}本`（既存） | `{name}: {count} videos`（既存） |
    | `library_set_count_filtered` | `{name}：{shown}本 / {total}本` | `{name}: {shown} / {total} videos` |

  - 「絞っている」とは、検索の文字がある、または4つのどれかを選んでいるとき。並び順は含めない。

- [ ] **Step 4: Run `npx vitest run src/features/library src/features/exercise-sets` → PASS**

- [ ] **Step 5: コミット** `feat(library): set row, collapsible filters and compact count line`

---

### Task 3: 「今日」のおすすめ部分

**Files:**
- Modify: `src/features/today/components/today-screen.tsx`, `recommended-exercise-card.tsx`, `src/features/today/use-today-data.ts`
- Modify: `src/features/logging/components/exercise-log-actions.tsx`（クラスのみ）, `globals.css`, `messages/*`
- Test: `src/features/today/today-screen.test.tsx`, `src/features/today/recommended-exercise-card.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `VideoCard`、`ExerciseSetMenu`。Task 2 の `SetSwitcher`
- Produces:
  - `useTodayData` の戻り値に `reloadSets(): Promise<void>` を足す。セット一覧を読み直し、選んでいたセットが消えていればおすすめに戻る（今の判定をそのまま使う）。
  - `RecommendedExerciseCard` の props に `sets: ExerciseSet[]` と `onSetsChanged(): void` を足す。中身は `VideoCard` で組み直す。
    - `headingLevel={3}`。
    - `eyebrow` は役割の文言。
    - `meta` は `[強度, 部位, 目的]`。視聴回数は出さない。
    - `menu` は `ExerciseSetMenu`。
    - `children` は `ExerciseLogActions`。

- [ ] **Step 1: 失敗するテストを書く**（`today-screen.test.tsx`）
  - `"reshuffle is a small link-style button next to the heading"`：`button` "Show 3 others" があり、押すと今と同じく別の3本になる（既存の入れ替えテストを流用）。説明文 `today_recommended_text` の en 値は画面にない。
  - `"cards open the video from the title and have no Watch button text"`：`link` "Watch Delta" の `href` は `/exercises?exerciseId=delta`（既存の検証のまま）。`queryByText("Watch")` は null。
  - `"set menu on a Today card adds the video to a set"`：
    - セット Morning を作る。
    - おすすめのカードで `button` "Add Delta to a set" を押し、"Morning" にチェックを付ける。
    - `listExerciseSets()` で Morning に delta が入っていることを確かめる。
  - `"removing a video from the shown set makes its card disappear"`：
    - Morning(["delta","epsilon"]) を選ぶ。
    - Delta の⋮で Morning のチェックを外すと、region 内の h3 が `["Epsilon"]` だけになる。
  - 既存の「今日」のテストは、なくなった説明文を探す部分以外は変えずに通ること。

`recommended-exercise-card.test.tsx` は新しい props（`sets={[]}`, `onSetsChanged={vi.fn()}`）に合わせて直し、href の検証は残す。

- [ ] **Step 2: Run `npx vitest run src/features/today` → FAIL**

- [ ] **Step 3: 実装する**
  - **見出しの行:**
    - 見出しと、その右に小さな文字ボタン（lucide `RotateCw` ＋ `today_recommended_reshuffle`）を並べる。文字ボタンはおすすめ表示のときだけ出す。
    - 説明文（`today_recommended_text`、`today_set_text`）は消し、キーも削除する。
    - 切り替えは `SetSwitcher`（ariaLabel `today_source_aria`、allLabel `today_recommended_heading`）にし、`.today-screen__source-*` の CSS は削除する。
  - **カードを並べる部分:** カードを2列以上で並べる今のグリッドは残す。カードは Task 1 と同じ見た目にする。
  - **`ExerciseLogActions`:** 枠線だけの小さな丸いボタンにし、状態の文字は同じ行の右に灰色で出す。文言と動きは変えない。CSS だけ変更し、詳細ページにも同じ見た目が効く。
  - **i18n:** ja の `today_recommended_reshuffle` を `別の3本` にする。en は "Show 3 others" のまま。

- [ ] **Step 4: Run `npx vitest run src/features/today src/features/logging` → PASS**

- [ ] **Step 5: コミット** `feat(today): compact recommendations header and YouTube-style cards`

---

### Task 4: 動画の詳細ページ

**Files:**
- Modify: `src/features/library/components/exercise-detail-screen.tsx`, `globals.css`, `messages/*`
- Test: `src/features/library/components/exercise-detail-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `ExerciseSetMenu`（`variant="button"`）、`listExerciseSets()`

- [ ] **Step 1: 失敗するテストを書く**
  - `"shows title and a single meta line instead of boxes"`：
    - 見出しにタイトルが出る。
    - `"1:00 · High intensity · Lower body · Strength"` の1行が見える。
    - `queryByText("Purpose")`（`meta_purpose` の en 値）は null。
  - `"adds the video to a new set from the + Set button"`：
    - `button` "Add {title} to a set" を押し、"+ New set" を選ぶ。
    - "Morning" と入力して "Save" を押すと、`listExerciseSets()` に `{ name: "Morning", exerciseIds: [id] }` がある。
  - `"logging still works and the description box shows today's status"`：
    - 説明の囲みに説明文と "Not logged yet" が出る。
    - "Did it"（`result_did` の en 値）を押すと "1 times today" になる。
  - 既存の "Watch video" リンクのテスト（外部リンク、`recordWatchEvent`）は変えずに通る。

- [ ] **Step 2: Run `npx vitest run src/features/library/components/exercise-detail-screen.test.tsx` → FAIL**

- [ ] **Step 3: 実装する**
  - **動画:** サムネイル・再生ボタン・埋め込みは今のまま残す。
  - **動画の下:**
    - タイトル（大きめの太字）を置く。
    - その下に灰色1行（`formatDuration` ＋ Task 1 の `meta_intensity_value` ＋ 部位 ＋ 目的。視聴回数は `countWatchesByExercise()` で読み、0なら出さない）を置く。
  - **ボタンの行:**
    - 「できた」「一部できた」（`ExerciseLogActions` のボタン部分）と `ExerciseSetMenu variant="button"` を横に並べる。
    - セット一覧はこの画面で `listExerciseSets()` から読み、`onChanged` で読み直す。
    - 外部リンク版の "Watch video" はこの行の先頭に置く。
  - **説明の囲み:** 先頭に今日の状態（`ExerciseLogActions` の状態表示と同じ文言）を太字で出し、その下に説明文を置く。
    - `ExerciseLogActions` に `showStatus?: boolean`（既定 true）を足す。詳細ページではボタンの行で `false` にし、状態は囲みに出す。
  - **読み込み中:** 今の読み込み中の表示（`detail_loading_*`）は、ボタンの行と囲みの位置に出す。
  - **i18n:** 新しいキーは不要の見込み。使わなくなったキーがあれば消す。

- [ ] **Step 4: Run `npx vitest run src/features/library src/features/logging` → PASS**

- [ ] **Step 5: 全体の確認**

Run: `npm test`、`npx tsc --noEmit 2>&1 | grep -iE "video-card|set-switcher|exercise-set|library|today|exercise-detail|exercise-log-actions|messages/"`（空であること。既存の無関係なエラーは約166件ある）、`npm run lint`
Expected: テスト全部 PASS、grep 空、lint エラー 0

- [ ] **Step 6: コミット** `feat(detail): YouTube-style video detail page with + Set`
