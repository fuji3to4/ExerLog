# マイリスト（セット） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 動画を「セット」にまとめ、ライブラリのカードのメニューで出し入れし、フィルターで絞り込み、「今日」でおすすめとセットを切り替えて表示できるようにする。

**Architecture:** セットは Dexie の新テーブル `exerciseSets`（v15）に1セット＝1レコードで保存し、既存のテーブルと同じ手順（stamp・トゥームストーン・`scheduleSync()`・`TableSyncConfig`）でスプレッドシートの `ExerciseSets` タブに同期する。セットの中の動画は、読むときに `resolveSetExercises` でライブラリにある動画だけに解決する（消えた動画の id は書き換えずに飛ばす）。「今日」で選んだセットは端末ごとに localStorage に覚える。

**Tech Stack:** Next.js 15 / React 19, Dexie 4, Radix DropdownMenu・Dialog, Vitest 3 + Testing Library, 自前 i18n（`messages/ja.ts`・`en.ts`）。

**Spec:** `docs/superpowers/specs/2026-10-29-exercise-sets-design.md`

## Global Constraints

- 画面上の呼び名は「セット」（en: "set"）。コード上は `ExerciseSet`。
- メニューはカードに付いて開くドロップダウン。下から出るシート（`components/ui/sheet.tsx`）は使わない。名前入力は中央に出る `components/ui/dialog.tsx` を使う。
- セットの中の順番は追加した順。並べ替え機能は作らない。
- 動画がライブラリから消えても、セットのデータは書き換えない。表示時に飛ばす。
- 「今日」でセットを表示しているときは、役割ラベルと「別の3本にする」を出さない。未実施の印や警告も出さない。
- おすすめ（3本・役割・日ごとに固定・入れ替え）の動きは一切変えない。
- 文言は ja / en の両方に足す。新しいキーは `set_*` / `library_set_*` / `today_set_*` の接頭辞を付ける。
- モジュールタグは付けない（全ビルドで有効）。CSV 入出力・`clear-all-records.ts` は触らない。

## Review Focus

- 選んでいたセットを消す（ライブラリのフィルター選択中）→ フィルターは「すべて」に戻る。（Task 4 にテスト）
- 「今日」で覚えていたセットが別の端末で消され、同期で消えた → 次に開くと「今日のおすすめ」に戻り、エラーにならない。（Task 5 にテスト）
- セットに、ライブラリから消えた動画の id が残っている → ライブラリ・「今日」とも表示せず、本数にも数えない。（Task 1・Task 4 にテスト）
- スプレッドシートの `exerciseIds` セルが空・壊れた JSON → 空のセットとして読み、同期は止まらない。（Task 1 にテスト）
- 空白だけの名前 → セットは作られない（保存ボタンが押せない）。（Task 3 にテスト）

---

## File Structure

- Create `src/features/exercise-sets/resolve-set-exercises.ts` — セットの id 列をライブラリの動画に解決する純関数。
- Create `src/features/storage/exercise-sets.repository.ts` — セットの読み書き。
- Create `src/features/exercise-sets/selected-set-store.ts` — 「今日」で選んだセット id の localStorage 保存。
- Create `src/features/exercise-sets/components/set-name-dialog.tsx` — 新規作成・名前変更の共通ダイアログ。
- Create `src/features/exercise-sets/components/exercise-set-menu.tsx` — カードの「⋯」メニュー。
- Modify `src/lib/types.ts`, `src/features/storage/app-db.ts`, `src/features/sync/sync-config.ts`
- Modify `src/features/library/components/library-screen.tsx`, `library-filters.tsx`
- Modify `src/features/today/use-today-data.ts`, `src/features/today/components/today-screen.tsx`
- Modify `src/features/i18n/messages/ja.ts`, `en.ts`, `src/app/globals.css`

---

### Task 1: セットのデータ・リポジトリ・同期

**Files:**
- Modify: `src/lib/types.ts`（`ExerciseVideo` の近く）
- Modify: `src/features/storage/app-db.ts`（v14 の後に v15、テーブル宣言）
- Create: `src/features/storage/exercise-sets.repository.ts`
- Create: `src/features/exercise-sets/resolve-set-exercises.ts`
- Modify: `src/features/sync/sync-config.ts`
- Test: `src/features/storage/exercise-sets.repository.test.ts`（新規）, `src/features/exercise-sets/resolve-set-exercises.test.ts`（新規）, `src/features/modules/data-registry.test.ts:40-54`, `src/features/storage/storage.test.ts:213`, `src/features/sync/sync-engine.test.ts`

**Interfaces:**
- Produces:
  - `type ExerciseSet = { id: string; name: string; exerciseIds: string[]; createdAt: string; updatedAt: string }`（`@/lib/types`）
  - `appDb.exerciseSets: Table<ExerciseSet, string>`、インデックス `"id, createdAt"`
  - `listExerciseSets(): Promise<ExerciseSet[]>` — `createdAt` 昇順
  - `createExerciseSet(name: string, exerciseIds?: string[]): Promise<ExerciseSet>` — `name` は trim して保存。trim 後が空なら `Error` を投げる。id は `crypto.randomUUID()`
  - `renameExerciseSet(id: string, name: string): Promise<void>` — trim、空なら `Error`
  - `setExerciseInSet(setId: string, exerciseId: string, included: boolean): Promise<void>` — `true` で末尾に追加（既にあれば何もしない）、`false` で取り除く
  - `deleteExerciseSet(id: string): Promise<void>` — トゥームストーン表名 `"ExerciseSets"`
  - `resolveSetExercises(set: ExerciseSet, exercises: ExerciseVideo[]): ExerciseVideo[]` — `set.exerciseIds` の順、ライブラリにない id は飛ばす

- [ ] **Step 1: 失敗するテストを書く**

`resolve-set-exercises.test.ts`:
```ts
test("keeps the set's order and skips ids missing from the library", () => {
  const set = { id: "s", name: "朝用", exerciseIds: ["c", "gone", "a"], createdAt: "", updatedAt: "" };
  expect(resolveSetExercises(set, [video("a"), video("b"), video("c")]).map((e) => e.id)).toEqual(["c", "a"]);
});
```

`exercise-sets.repository.test.ts`（`beforeEach` で `exerciseSets`・`tombstones` を clear。`scheduleSync` は today-screen.test.tsx と同じく `vi.mock` する）:
- `createExerciseSet("  朝用 ", ["a"])` → `name === "朝用"`, `exerciseIds` が `["a"]`, `updatedAt` と `createdAt` が空でない、`scheduleSync` が呼ばれる。
- `createExerciseSet("   ")` が reject する。`renameExerciseSet(id, " ")` も reject する。
- `listExerciseSets()` が `createdAt` 昇順で返す（`createdAt` を直接入れた2件で確認）。
- `setExerciseInSet(id, "b", true)` を2回 → `["a", "b"]`（重複なし、末尾追加）。`setExerciseInSet(id, "a", false)` → `["b"]`。
- `deleteExerciseSet(id)` → テーブルから消え、`appDb.tombstones.where("table").equals("ExerciseSets").count()` が 1。

`sync-config` について:
- `data-registry.test.ts` の期待するタブ順で、`"Exercises"` の直後・`"Tombstones"` の前に `"ExerciseSets"` を入れる。
- `exerciseSets` の `fromRow` を直接呼ぶテストを追加する（`sync-engine.test.ts` か新規ファイル）。`exerciseIds` が `'["a","b"]'` なら `["a","b"]`、`""` や `"not json"` なら `[]` になること。
- `toRow` との往復で同じ値に戻ること。

`storage.test.ts:213`: `expect(upgraded.verno).toBe(15)`。

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run src/features/storage/exercise-sets.repository.test.ts src/features/exercise-sets src/features/modules/data-registry.test.ts src/features/storage/storage.test.ts`
Expected: FAIL（モジュールが見つからない、タブ順、verno 14）

- [ ] **Step 3: 実装する**

- `app-db.ts`: `this.version(15).stores({...})` に v14 の全テーブルを繰り返し、`exerciseSets: "id, createdAt"` を足す。テーブルプロパティを宣言する。
- リポジトリは `exercise-catalog.repository.ts` と同じ形にする。書き込みのたびに `updatedAt: localIsoNow()` を付け、`scheduleSync()` を呼ぶ。削除は `rw` トランザクションで `recordTombstones("ExerciseSets", [id])` を行う。
- `exerciseSetsConfig`: `tabName: "ExerciseSets"`, `keyColumn: "id"`, `updatedAtKey: "updatedAt"`, `deletable: true`, `headers: ["id", "name", "exerciseIds", "createdAt", "updatedAt"]`。`exerciseIds` は `JSON.stringify` で書き、読むときは配列でなければ `[]` にする（try/catch）。`readFromDb`・`replaceDb` は既存の設定と同じ形。`tableSyncConfigs()` では `exercisesConfig` の後、`syncedDbTables()` では `appDb.exercises` の後に足す。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/features/storage src/features/exercise-sets src/features/modules/data-registry.test.ts src/features/sync`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/types.ts src/features/storage src/features/exercise-sets src/features/sync src/features/modules/data-registry.test.ts
git commit -m "feat(sets): exercise set storage, repository and sheet sync"
```

---

### Task 2: 「今日」で選んだセットの保存

**Files:**
- Create: `src/features/exercise-sets/selected-set-store.ts`
- Test: `src/features/exercise-sets/selected-set-store.test.ts`

**Interfaces:**
- Produces:
  - `SELECTED_SET_STORAGE_KEY = "exerlog-today-selected-set"`
  - `readSelectedSetId(): string | null`
  - `writeSelectedSetId(id: string | null): void` — `null` はキーを消す（おすすめ）

- [ ] **Step 1: 失敗するテストを書く**
  - 何も保存していなければ `null` を返す。
  - `write("s1")` → `read() === "s1"`。`write(null)` → `null`。
  - `localStorage.getItem` が throw しても `null` を返す（`vi.spyOn(Storage.prototype, "getItem")`）。

- [ ] **Step 2: Run `npx vitest run src/features/exercise-sets/selected-set-store.test.ts` → FAIL**

- [ ] **Step 3: 実装する。** `reshuffle-store.ts` と同じく、読み書きを try/catch で包む。値はそのままの文字列で保存する。

- [ ] **Step 4: 同じコマンドで PASS を確認する**

- [ ] **Step 5: コミット** `feat(sets): remember today's selected set per device`

---

### Task 3: ライブラリのカードメニュー（⋯）と名前ダイアログ

**Files:**
- Create: `src/features/exercise-sets/components/set-name-dialog.tsx`
- Create: `src/features/exercise-sets/components/exercise-set-menu.tsx`
- Modify: `src/features/library/components/library-screen.tsx`（セットの読み込み、カードへのメニュー配置）
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`, `src/app/globals.css`
- Test: `src/features/library/library-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `listExerciseSets`, `createExerciseSet`, `setExerciseInSet`
- Produces:
  - `SetNameDialog({ open, title, initialName, onSubmit(name: string): Promise<void> | void, onOpenChange(open: boolean) })` — 入力欄（label `set_name_label`）、保存（`settings_form_save`）、キャンセル（`settings_form_cancel`）。trim 後が空なら保存ボタンを disabled にする。Task 4 で名前変更に再利用する。
  - `ExerciseSetMenu({ exercise: ExerciseVideo, sets: ExerciseSet[], onChanged(): void })`
  - `LibraryScreen` 内の `loadExercises` は、セットも一緒に読み込むようにする（`exerciseSets` state）

- [ ] **Step 1: 失敗するテストを書く**（`library-screen.test.tsx`、`beforeEach` で `appDb.exerciseSets.clear()`、en 表示）
  - `"adds a video to a new set from the card menu"`:
    - "Shoulder rolls" カードで `getByRole("button", { name: "Add Shoulder rolls to a set" })` をクリックする。
    - `menuitem` "+ New set" を選び、dialog の "Set name" に "Morning" と入力して "Save" を押す。
    - `await listExerciseSets()` が `[{ name: "Morning", exerciseIds: ["<shoulder rolls id>"] }]` を含む。
  - `"toggles set membership with checkboxes and keeps the menu open"`:
    - 事前に `createExerciseSet("Morning")` と `createExerciseSet("Evening")` を作る。
    - メニューを開き、`menuitemcheckbox` "Morning" をクリックする。メニューは開いたまま（`getByRole("menuitemcheckbox", { name: "Evening" })` がまだある）で、"Evening" もクリックする。
    - 両方のセットに id が入る。もう一度 "Morning" をクリックすると、Morning から外れる。
  - `"cannot save a set with a blank name"`: "   " を入力すると "Save" が disabled。
  - メニューのトリガーは編集モードでなくても表示されることを、上のテスト（編集スイッチは触らない）で兼ねる。

- [ ] **Step 2: Run `npx vitest run src/features/library` → FAIL**

- [ ] **Step 3: 実装する**
  - **メニュー:** `add-record-menu.tsx` と同じ形（`modal={false}`, `align="end"`, `sideOffset={6}`, 同じ Content クラス、`ITEM_CLASS`）。
  - **トリガー:** 「⋯」アイコンボタン（lucide `Ellipsis`）。aria-label は `set_menu_aria`。カードの「見る」リンクの横に置く。
  - **チェック項目:**
    - ラベルは `set_menu_title`、項目は `DropdownMenu.CheckboxItem`。
    - `checked` は `set.exerciseIds.includes(exercise.id)`。`onSelect` で `event.preventDefault()` してメニューを閉じない。
    - `onCheckedChange` で `setExerciseInSet` を呼んだあと、`onChanged()` を呼ぶ。
  - **新規作成:** 区切り線の下に `set_menu_new`。選ぶと `SetNameDialog` を開き、保存したら `createExerciseSet(name, [exercise.id])` → `onChanged()`。
  - **i18n（ja / en）:**

    | キー | ja | en |
    |---|---|---|
    | `set_menu_aria` | `{title}をセットに入れる` | `Add {title} to a set` |
    | `set_menu_title` | `セットに入れる` | `Add to set` |
    | `set_menu_new` | `＋ 新しいセットを作る` | `+ New set` |
    | `set_name_new_title` | `新しいセット` | `New set` |
    | `set_name_label` | `セットの名前` | `Set name` |
    | `set_name_placeholder` | `例：朝用` | `e.g. Morning` |

- [ ] **Step 4: Run `npx vitest run src/features/library` → PASS**

- [ ] **Step 5: コミット** `feat(library): add videos to sets from the card menu`

---

### Task 4: ライブラリのセットフィルターと、名前変更・削除

**Files:**
- Modify: `src/features/library/components/library-filters.tsx`, `library-screen.tsx`
- Modify: `messages/ja.ts`, `en.ts`
- Test: `src/features/library/library-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `listExerciseSets`, `renameExerciseSet`, `deleteExerciseSet`, `resolveSetExercises`。Task 3 の `SetNameDialog`
- Produces:
  - `LibraryFilterState` / `LibraryFiltersValue` に `set: string` を足す（`""` は「すべて」）。
  - `LibraryFilters` の props に `sets: ExerciseSet[]`、`onRenameSet(set: ExerciseSet): void`、`onDeleteSet(set: ExerciseSet): void` を足す。

- [ ] **Step 1: 失敗するテストを書く**
  - `"filters by set in the order videos were added, skipping deleted ones"`:
    - `createExerciseSet("Morning", [idB, "gone", idA])` を作る。
    - "Set" で Morning を選ぶ → 記事の順が B, A。
    - 本数表示 `"Morning: 2 videos"` が見える。
  - `"set filter combines with other filters"`: Morning を選んだ状態で body area を絞ると、両方の条件に合うものだけが残る。
  - `"renames the selected set"`:
    - Morning を選ぶ → `getByRole("button", { name: "Set actions" })` → `menuitem` "Rename" → ダイアログで "Daily" にして保存する。
    - 選択欄の表示が "Daily" になる。
  - `"deleting the selected set returns the filter to All and keeps the videos"`:
    - `vi.spyOn(window, "confirm").mockReturnValue(true)` → "Delete this set" を選ぶ。
    - "Set" の値が `""` に戻り、記事数がライブラリ全件になる。`appDb.exercises.count()` は変わらない。
  - `"set actions button only appears while a set is selected"`: 「すべて」の状態では "Set actions" がない。

- [ ] **Step 2: Run `npx vitest run src/features/library` → FAIL**

- [ ] **Step 3: 実装する**
  - **選択欄:** `FilterSelect` で "Set" を検索欄の下、グリッドの先頭に足す。選択肢は `library_set_all` と、各セット（作った順）。
  - **⋯ ボタン:** セットを選んでいるときだけ、横に「⋯」ボタン（aria-label `library_set_actions_aria`）を出す。Task 3 と同じ形のドロップダウンで、`library_set_rename` と `library_set_delete` を並べる。
  - **絞り込み:**
    - `filters.set` があれば、まず `resolveSetExercises(set, exercises)` を元のリストにしてから既存の絞り込みをかける。
    - 「よく見る順」は従来どおり安定ソート。既定の並びではセットの順を保つ。
  - **本数表示:** セット選択中は `library_set_count` を `library_result_count` の前に出す。数えるのは、他のフィルター前の解決済み本数。
  - **削除:**
    - `window.confirm(t("library_set_delete_confirm", { name }))` で確認してから `deleteExerciseSet` を呼ぶ。
    - そのあと filters の `set` を `""` に戻し、再読み込みする。
    - 再読み込みで選択中の id がセット一覧から消えていた場合（同期など）も、`""` に戻す。
  - **i18n:**

    | キー | ja | en |
    |---|---|---|
    | `library_set_label` | `セット` | `Set` |
    | `library_set_all` | `すべて` | `All` |
    | `library_set_actions_aria` | `セットの操作` | `Set actions` |
    | `library_set_rename` | `名前を変える` | `Rename` |
    | `set_name_rename_title` | `セットの名前を変える` | `Rename set` |
    | `library_set_delete` | `このセットを消す` | `Delete this set` |
    | `library_set_delete_confirm` | `セット「{name}」を消しますか？動画はライブラリに残ります。` | `Delete the set "{name}"? The videos stay in the library.` |
    | `library_set_count` | `{name}：{count}本` | `{name}: {count} videos` |

- [ ] **Step 4: Run `npx vitest run src/features/library` → PASS**

- [ ] **Step 5: コミット** `feat(library): filter by set, rename and delete sets`

---

### Task 5: 「今日」でおすすめとセットを切り替える

**Files:**
- Modify: `src/features/today/use-today-data.ts`, `src/features/today/components/today-screen.tsx`
- Modify: `messages/ja.ts`, `en.ts`, `src/app/globals.css`
- Test: `src/features/today/today-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `listExerciseSets`, `resolveSetExercises`。Task 2 の `readSelectedSetId`, `writeSelectedSetId`
- Produces: `useTodayData` の戻り値に以下を足す（既存の値は変えない）。
  - `sets: ExerciseSet[]`
  - `selectedSet: ExerciseSet | null` — 保存された id がセット一覧にあるときだけ。なければ `null`
  - `selectedSetExercises: ExerciseVideo[]`
  - `selectSet(id: string | null): void` — `writeSelectedSetId` を呼んで state を更新する

- [ ] **Step 1: 失敗するテストを書く**（`beforeEach` で `appDb.exerciseSets.clear()`。localStorage は setup が毎回消す）
  - `"shows no switcher when there are no sets"`: `queryByRole("group", { name: "Show" })` が null。おすすめは従来どおり。
  - `"switching to a set shows all its videos in order without slot labels or reshuffle"`:
    - `createExerciseSet("Morning", ["zeta", "delta", "gone"])` を作る。
    - `button` "Morning" を押す。
    - 見出しが "Morning" になり、region 内の h3 が `["Zeta", "Delta"]`（この順）になる。
    - `aria-pressed="true"`、"Show 3 others"（`today_recommended_reshuffle` の en 値）がない、役割ラベル（`recommendation_slot_*` の en 値）がない。
  - `"remembers the chosen set on the next open"`: 選んだあと unmount → 再 render すると、最初から "Morning" が表示される。
  - `"falls back to recommendations when the remembered set no longer exists"`:
    - `writeSelectedSetId("deleted-id")` してから render する。
    - 見出しは "Today's recommendations"（`today_recommended_heading` の en 値）で、エラーにならない。
  - `"an empty set shows a hint linking to the library"`: 空のセットを選ぶと `today_set_empty` の文と `link` "Library" が出る。
  - `"logging from a set card works like a recommendation"`: セット表示中のカードで記録すると `appDb.exerciseLogs.count()` が 1 になる。既存の記録テストの手順を流用する。
  - 既存のおすすめのテストはすべて変更なしで通ること。

- [ ] **Step 2: Run `npx vitest run src/features/today` → FAIL**

- [ ] **Step 3: 実装する**
  - **データの読み込み（`useTodayData`）:**
    - `loadTodayData` の `Promise.all` に `listExerciseSets()` を足す。
    - 同じタイミングで `readSelectedSetId()` を読む。こうすると、`isHydrated` が true になった時点でセットと選択が揃っている。
    - `selectedSet` は `sets.find(s => s.id === storedId) ?? null`。
  - **画面（`TodayScreen`）:**
    - `CardHeader` の見出しは `selectedSet?.name ?? t("today_recommended_heading")`。
    - `sets.length > 0` のときだけ、見出しの下に切り替えボタンの列を出す。`role="group"` に aria-label `today_source_aria` を付け、中は `<button aria-pressed>`。先頭は `today_recommended_heading`、続けて作った順にセットを並べる。
    - セット選択中の説明文は `today_set_text`。「別の3本にする」は出さない。
    - カードは `selectedSetExercises` を `RecommendedExerciseCard` で `slot` を渡さずに並べる。`todayCount`・`onLog`・エラー表示は既存と同じ。
    - 空のセットのときは、`today_set_empty` と `/library` へのリンク（`today_library_button`）を出す。
  - **CSS:** 切り替えボタンの列は `display:flex; gap; overflow-x:auto; white-space:nowrap`。折り返さず、横にスクロールする。選択中のボタンは primary の色にする。
  - **i18n:**

    | キー | ja | en |
    |---|---|---|
    | `today_source_aria` | `表示するもの` | `Show` |
    | `today_set_text` | `今日の気分で選んでどうぞ。` | `Pick whatever suits you today.` |
    | `today_set_empty` | `このセットにはまだ動画がありません。ライブラリのカードの「⋯」から追加できます。` | `This set has no videos yet. Add some from the "⋯" menu on a library card.` |

- [ ] **Step 4: Run `npx vitest run src/features/today` → PASS**

- [ ] **Step 5: 全体の確認**

Run: `npm test` と `npx tsc --noEmit` と `npm run lint`
Expected: すべて PASS、エラー 0

- [ ] **Step 6: コミット** `feat(today): switch between recommendations and exercise sets`
