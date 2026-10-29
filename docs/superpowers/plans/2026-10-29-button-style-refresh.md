# ボタンの見た目の見直し（アプリ全体） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アプリ全体のボタンを A 案（主＝淡い主色の地＋主色の文字、副＝塗りなし＋細い枠線、危険＝淡い赤、高さ 36px・文字 13px）にそろえる。

**Architecture:** テーマ変数に「淡い地」用の派生変数を足し、共通の `buttonVariants` と `globals.css` のボタン用クラス、画面ごとの Tailwind のべた塗りを、その変数で書き直す。動き（処理、`aria-pressed`、disabled）は変えない。

**Tech Stack:** Tailwind（class-variance-authority）、`src/app/globals.css`（テーマ：`:root`＝warm、`[data-theme="cool"]`、`[data-theme="dark"]`）、Vitest。

**Spec:** `docs/superpowers/specs/2026-10-29-button-style-refresh-design.md`

## Global Constraints

- 色はテーマ変数から作る。新しい変数は全テーマで成り立つこと（`hsl(var(--primary) / α)` のような派生なら1か所の定義で全テーマに効く）。
- **主ボタン:** 淡い主色の地＋主色の文字。影はなし。
- **副ボタン:** 塗りなし＋`--border` の細い枠線＋通常の文字色。
- **危険ボタン:** 淡い赤の地＋赤の文字。
- **保存済み:** 淡い緑の地＋緑の文字。
- **選択中の切り替えボタン:** 淡い主色の地＋主色の文字＋薄い主色の枠。
- **大きさ:** 通常は高さ `2.25rem`（36px）、文字 `0.8125rem`、太さ 600、横の余白 14px 前後。小さいもの（`size="sm"`、セットの列）は `2rem`。アイコンだけのボタンは `2.25rem` 角。
- **押せる範囲:** 見た目と同じにする（`min-h-12` などの 48px 確保を外す）。
- **残すもの:** フォーカスのリングと disabled の薄さ。
- **文字の読みやすさ:** 全テーマで、淡い地と文字のコントラストが 4.5:1 以上。
- **対象外:** カレンダーの日付のマス、動画の再生ボタン、サイドバーと下部ナビ（ナビゲーション）、バッジ・スイッチ・ツールチップなどボタン以外の部品。ボタンの文言・配置も変えない。
- 既存テストは、見た目のクラスや CSS の値を直接見ているもの以外は変えずに通ること。`globals-theme.test.ts` は期待値を新デザインに更新してよいが、「テーマ変数を使っている」ことを確かめる形は残す。

## Review Focus

- 暗いテーマで淡い主色の地の上の主色の文字 → 読める（4.5:1 以上）。（Task 1 で3テーマのコントラストを計算するテスト）
- disabled の主ボタン → 今と同じく薄くなり押せない。（Task 1 の Button テスト）
- 選択中と選択されていない切り替えボタン → 区別がつく（地の有無）。（Task 2 の `globals-theme.test.ts` で選択中だけ地があることを確認）
- べた塗りの取り残し → ボタン用のセレクタ・クラスに `--accent-strong`／`hsl(var(--primary))`／`bg-primary` の地が残っていない。（Task 2 の監査テスト）
- フォーカスの表示 → 新しいボタンでもリングが出る。（Task 1 の Button テストで `focus-visible:ring-2` が残っていることを確認）

---

### Task 1: テーマ変数と共通の Button

**Files:**
- Modify: `src/app/globals.css`（`:root` と各テーマの変数部分）
- Modify: `src/components/ui/button.tsx`
- Test: `src/components/ui/button.test.tsx`, `src/app/button-tokens.test.ts`（新規）

**Interfaces:**
- Produces:
  - 新しい変数（`:root` に定義。派生なので全テーマに効く）。Task 2 はこれだけを使う。
    - `--tonal-bg: hsl(var(--primary) / 0.12)`
    - `--tonal-bg-hover: hsl(var(--primary) / 0.18)`
    - `--tonal-border: hsl(var(--primary) / 0.35)`
    - `--tonal-text: hsl(var(--primary))`
  - `--success-bg` / `--success-text` / `--danger-bg` / `--danger-text` は今ある値を使う。`[data-theme="dark"]` には暗い地に合う値（例：`--danger-bg: hsl(0 50% 20%)`, `--danger-text: hsl(0 80% 75%)`、success も同様）を足す。
  - `buttonVariants`:
    - **base:**
      - `min-h-12` を外す。
      - `h-9 px-3.5 text-[0.8125rem] font-semibold` にする。
      - `rounded-full`・`focus-visible:ring-2 …`・`disabled:opacity-50` は残す。
    - **variant:**
      - `default` は `bg-[var(--tonal-bg)] text-[var(--tonal-text)] hover:bg-[var(--tonal-bg-hover)]`。影はなし。
      - `secondary` と `outline` は `border-border bg-transparent text-foreground hover:bg-muted`。
      - `destructive` は `bg-[var(--danger-bg)] text-[var(--danger-text)]`。
      - `ghost` と `link` は今のまま。
    - **size:**
      - `default` は `h-9`。
      - `sm` は `h-8 px-3 text-xs`。
      - `lg` は `h-10 px-4`。
      - `icon` は `size-9 rounded-xl p-0`。

- [ ] **Step 1: 失敗するテストを書く**

`button.test.tsx` に足す:
- `"default variant is tonal, not a solid fill"`：`buttonVariants()` が `bg-[var(--tonal-bg)]` と `text-[var(--tonal-text)]` を含み、`bg-primary ` と `shadow-sm` を含まない。
- `"buttons are 36px with 13px text and keep focus ring and disabled styles"`：`buttonVariants()` が `h-9`、`text-[0.8125rem]`、`focus-visible:ring-2`、`disabled:opacity-50` を含み、`min-h-12` を含まない。`buttonVariants({ size: "sm" })` は `h-8`、`buttonVariants({ size: "icon" })` は `size-9`。
- `"secondary/outline have no fill and destructive is tonal red"`：`secondary` と `outline` は `bg-transparent` と `border-border` を含む。`destructive` は `bg-[var(--danger-bg)]` を含み、`bg-destructive` を含まない。

`button-tokens.test.ts`（`globals.css` を読み、`:root` と各テーマの変数から計算する）:
- `"tonal text is readable on the tonal background in every theme"`
  - warm・cool・dark の各テーマで、背景 `--card` に `--primary` を α=0.12 で重ねた色と、`--primary` の文字色の WCAG コントラストが 4.5 以上。
  - HSL から相対輝度を出す小さな関数をテスト内に書く。
  - 満たさないテーマがあれば、そのテーマに `--tonal-text`（例：暗いテーマでは明るい主色）を上書きして通す。
- `"danger and success text are readable on their backgrounds in every theme"`：同様に 4.5 以上。

- [ ] **Step 2: Run `npx vitest run src/components/ui/button.test.tsx src/app/button-tokens.test.ts` → FAIL**

- [ ] **Step 3: 実装する**（Interfaces のとおり。変数の値はコントラストのテストが通るように調整してよい）

- [ ] **Step 4: Run 同じコマンド → PASS。続けて `npm test` で他の画面のテストが壊れていないことを確認する**（クラス名を直接見ているテストがあれば、新しいクラスに合わせて直す）

- [ ] **Step 5: コミット** `feat(ui): tonal 36px buttons and theme tokens`

---

### Task 2: 画面ごとのボタン用クラスとべた塗りの置き換え

**Files:**
- Modify: `src/app/globals.css`（ボタン用クラス）
- Modify: `src/features/history/components/history-module-tabs.tsx:77`, `src/features/timeline/components/segmented-tabs.tsx:59`（選択中の `bg-primary text-primary-foreground`）、ほか監査で見つかったもの
- Test: `src/app/globals-theme.test.ts`, `src/app/button-fills.test.ts`（新規）

**Interfaces:**
- Consumes: Task 1 の `--tonal-bg` / `--tonal-bg-hover` / `--tonal-border` / `--tonal-text` / `--danger-*` / `--success-*`

対象（少なくとも次。`grep` で他にもあれば同じルールで直す）:

| セレクタ | 種類 |
|---|---|
| `.button-row a, .button-row button`（~globals.css:172, 地 `--accent-strong`） | 主 |
| `.button-row .button-secondary` | 副 |
| `.today-screen__primary-button`（~276, 285） | 主 |
| `.set-switcher__button` / `[aria-pressed="true"]`（~238, 252） | 切り替え（小 `2rem`） |
| `.exercise-log-actions__button` | 副（`2.25rem`） |
| `.exercise-set-menu__button` | 副 |
| `.history-calendar__nav-btn` | 副（アイコン `2.25rem` 角） |
| `.history-screen__preset-btn`（選択中を含む） | 切り替え |
| `.settings-action-button`（~980, 地 `--accent-strong`）/ `--secondary` / `--danger` | 主 / 副 / 危険 |
| `.save-button--saved`（~1418, `#3aa76d`） | 保存済み |
| `.modal__actions` / `.seed-confirm-dialog__actions` / `.exercise-drawer__actions` / `.bulk-delete-confirm__actions` / `.data-management__buttons` / `.library-screen__edit-actions` / `.library-screen__card-actions` の中のボタン | 種類に応じて |
| `history-module-tabs.tsx`, `segmented-tabs.tsx` の選択中 | 切り替え（Tailwind：`bg-[var(--tonal-bg)] text-[var(--tonal-text)] border border-[var(--tonal-border)]`、未選択は `bg-transparent border border-border`） |

対象外（変えない）: `.history-calendar` の日付のマス、`.exercise-detail__play-button`、`bottom-nav.tsx`、`app-sidebar.tsx`、`badge.tsx`、`switch.tsx`、`tooltip.tsx`、`skeleton.tsx`、フォームの選択肢（`border-primary bg-primary/10` はすでに淡い）。

- [ ] **Step 1: 失敗するテストを書く**

`button-fills.test.ts`（監査）:
- `"no button selector keeps a solid primary/destructive fill"`
  - `globals.css` のルールのうち、セレクタに `button` / `btn` / `-action` / `__actions` を含むもの（対象外リストの `.exercise-detail__play-button` と `.history-calendar__day*` を除く）を集める。
  - その `background` に `var(--accent-strong)`、`hsl(var(--primary))`、`hsl(var(--destructive))`、`#3aa76d` が含まれないこと。
- `"tsx buttons and tabs do not use solid bg-primary"`：`src/features/**/*.tsx` と `src/components/**/*.tsx`（対象外ファイルとテストを除く）に `bg-primary text-primary-foreground` の組み合わせがないこと。

`globals-theme.test.ts`：
- 主色の地を固定している期待値（例：`.today-screen__primary-button` の `background: var(--accent-strong)`、`.settings-action-button` など）を、`background: var(--tonal-bg)` と `color: var(--tonal-text)` に更新する。
- `.set-switcher__button[aria-pressed="true"]` は `background: var(--tonal-bg)` を持ち、未選択の `.set-switcher__button` は `background: transparent` であることを足す。
- `.save-button--saved` は `background: var(--success-bg)` と `color: var(--success-text)` を持つことを足す。

- [ ] **Step 2: Run `npx vitest run src/app` → FAIL**

- [ ] **Step 3: 実装する**
  - 表の対象を、Global Constraints の種類ごとの見た目と大きさに書き直す。
  - 重複したクラスはまとめてよい。
  - ボタンと同じ行の入力欄・select と高さがずれて見苦しいときだけ、その行の入力欄を `2.25rem` に合わせてよい。

- [ ] **Step 4: Run `npx vitest run src/app` → PASS。そのあと `npm test`、`npx tsc --noEmit 2>&1 | grep -iE "button|globals|history|timeline|settings"`（新しいエラーなし。既存の無関係なエラーは約166件）、`npm run lint`**

- [ ] **Step 5: 目で確認する**（`npm run dev` → `http://localhost:3000/ExerLog/`。ポートは空いているものでよい）
  - 対象は「今日」・ライブラリ（編集モード含む）・設定（データ管理以降）・履歴・ダイアログ1つ（例：「＋ 記録する」）。
  - それぞれ、設定で明るいテーマと暗いテーマに切り替えて見る。
  - べた塗りの取り残し、読みにくい文字、高さのずれがあれば直す。
  - 確認した画面と結果をレポートに書く。

- [ ] **Step 6: コミット** `feat(ui): apply tonal button style across screens`
