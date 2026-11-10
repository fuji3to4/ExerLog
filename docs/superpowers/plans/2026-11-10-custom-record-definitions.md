# カスタム記録（JSON の定義で記録の種類を足す）段階1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JSON の定義を読み込むと記録の種類（カスタム記録）が増え、入力・タイムライン・履歴・期間のまとめ・CSV・Google 同期・設定の ON/OFF に、既存のモジュールと同じように出るようにする。定義の書き出し・論理削除・復元と、「AI に渡す説明」のコピーも作る。

**Architecture:**
- 新しいフォルダ `src/features/modules/custom/` に、カスタム記録の全部を置く。
  - 定義の形と検査（純粋な関数）
  - 定義の保存と、メモリ上のストア（購読できる）
  - 1つの定義から `RecordModuleData` と `RecordModule` を作る工場
  - 汎用のフォーム、カード、履歴、まとめ
- レジストリを動的にする。`recordModuleData()` と `recordModules()` は、「コードのモジュール＋ストアにある定義から作ったモジュール」を返す。論理削除した定義もレジストリには残す（同期・全削除・件数・CSV のため）。画面の一覧からだけ外す。
- 同期では、定義のタブ `RecordTypes` を、記録のタブより先に同期する。そのあとストアを読み直し、増えたタブを作ってから、記録のタブを同期する。
- `RecordModule` の表示名とアイコンは、今は i18n のキーと lucide のアイコンに決め打ちになっている。これを、定義の文字列と絵文字も扱える形に広げる。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4、Recharts、Vitest + fake-indexeddb + Testing Library。新しい依存は入れない（スキーマのライブラリも使わない）。

**Spec:** `docs/superpowers/specs/2026-11-10-custom-record-definitions-design.md`
（土台の設計書: `docs/superpowers/specs/2026-10-27-record-modules-foundation-design.md`）

**範囲:** 設計書の「段階1」だけを扱う。段階2（体調・セルフケアをビルトイン定義に移す）は、段階1が動いてから別の計画にする（設計書の段階分けのとおり）。

## Global Constraints

- **定義の JSON の形**（形式の版 1）。キー名はこの計画で決める。
  ```json
  {
    "exerlogRecordType": 1,
    "id": "protein",
    "name": "プロテイン",
    "icon": "🥤",
    "color": "#5f9e7a",
    "description": "量・種類・タイミング",
    "fields": [
      { "id": "amount", "label": "量", "type": "number", "unit": "g", "min": 0, "max": 200, "step": 1, "required": true },
      { "id": "kind", "label": "種類", "type": "choice", "options": [{ "id": "whey", "label": "ホエイ" }, { "id": "soy", "label": "ソイ" }] },
      { "id": "timing", "label": "タイミング", "type": "multiChoice", "options": [{ "id": "wake", "label": "起床時" }, { "id": "post", "label": "トレ後" }] },
      { "id": "fasted", "label": "空腹時", "type": "boolean" },
      { "id": "brand", "label": "銘柄", "type": "text" },
      { "id": "taste", "label": "おいしさ", "type": "scale", "levels": 5, "lowLabel": "いまいち", "highLabel": "おいしい" }
    ]
  }
  ```
  - 項目の種類: `number`、`scale`、`choice`、`multiChoice`、`boolean`、`text`。
  - 表示用の文字列（`name`、`description`、`label`、`lowLabel`、`highLabel`、選択肢の `label`）は、文字列か、`{ "ja": "...", "en": "..." }` のどちらでもよい（`LocalizedText`）。表示言語のものがなければ、最初の値を使う。
  - 省略できるもの: `icon`（既定 `📝`）、`color`（既定は ID から決める）、`description`、`required`（既定 false）、`unit`、`min`、`max`、`step`、`levels`（既定 5、2〜10）、`lowLabel`、`highLabel`。
- **ID の決まり**
  - 定義 ID: `/^[a-z0-9][a-z0-9-]{0,39}$/`。
  - 項目 ID: `/^[A-Za-z][A-Za-z0-9_]{0,39}$/`。`id`、`date`、`recordedAt`、`note`、`updatedAt` は使えない。1つの定義の中で重複してはいけない。
  - 選択肢 ID: 項目 ID と同じ形。1つの項目の中で重複してはいけない。
- **内部の名前**
  - モジュール ID: `custom:<定義ID>`。この接頭辞があれば、既存のモジュールの ID とはぶつからない。
  - シートのタブ: `Custom_<定義ID>`。tombstone の `table` も同じ名前にする。
  - 定義のタブ: `RecordTypes`。列は `["id", "definition", "deleted", "updatedAt"]` で固定する（`headerMode` は exact）。`definition` には JSON の文字列を入れ、`deleted` は `"1"` か `""` にする。
  - Dexie（version 17 で足す）:
    - `customRecords: "id, typeId, date, recordedAt, [typeId+date]"`
    - `customRecordTypes: "id"`
- **値のシートの書き方**: `number` と `scale` は `String(n)`。`choice` は選択肢 ID。`multiChoice` は選択肢 ID を `|` でつなぐ。`boolean` は `"1"` か `"0"`。`text` はそのまま。値がなければ空のセル。
- **固定の列**: `["id", "date", "recordedAt", "note", "updatedAt"]`。項目の列はそのあとに、定義の順で並べる。そのあとに、定義にない列（消した項目）を名前順で並べる。
- **定義を変えたとき**（設計書のとおり）:
  - 項目 ID が同じで種類が違う定義は、読み込まない（`choice` と `multiChoice` の入れ替えも種類の変更）。
  - 選択肢を減らすのはかまわない。
  - 消した項目の値は、記録の中にもシートの列にも残す。
- **論理削除**: 定義の削除は `deleted: true` にするだけで、tombstone は付けない。同じ ID の定義を読み込むか、「元に戻す」で `deleted: false` にする。
- **全削除**: 「記録をすべて削除」は、削除済みの種類も含めてカスタム記録を消す。定義は消さない（この計画での決定。全削除のボタンは記録を消すものなので）。
- **見た目**: 既存のデザインに合わせる。ボタンは淡い色の 36px（`Button` の既定）。メニューは下から出るシートではなく、その場に開くドロップダウン（`@radix-ui/react-dropdown-menu`）にする。
- **i18n**: 新しい文言は `ja.ts` と `en.ts` の両方に足す。キーの接頭辞は `custom_`。
- **Google に見える名前**: `GOOGLE_NAMES` の決まりに従う（「Lymly」を使わない）。この計画では、タブ名以外に新しい名前を作らない。

## Review Focus

- **定義を読み込む前に設定が読まれても、カスタム記録の並び順と OFF が消えない。** ストアの読み込みは非同期なので、その前に `readModuleSettings` が走ると、`custom:` の ID が「知らないモジュール」として捨てられ、保存し直されてしまう。→ Task 6 のテスト `keeps custom ids that are not loaded yet`。
- **新しい端末で最初に同期したとき、別の端末で足した定義とその記録が、同じ1回の同期で入ってくる。** そのタブがまだ存在しなくても失敗しない。→ Task 7 のテスト `pulls a remote definition and its records in one run`。
- **消した項目の値は、編集して保存しても、シートとの往復を経ても消えない。** → Task 4 のテスト `keeps values of removed fields on update` と `round-trips removed-field columns`。
- **AI の出力をそのまま貼っても読み込める。** AI はよく ```` ```json ```` の囲みや前後の説明文を付ける。→ Task 1 のテスト `accepts JSON wrapped in a code fence or prose`。
- **削除済みの定義の記録も、同期・件数・全削除・CSV の対象になる。** → Task 6 のテスト `includes deleted types in data operations`。

---

## File Structure

新しく作るファイル（`src/features/modules/custom/`）:

| ファイル | 役割 |
| --- | --- |
| `definition.ts` | 定義の型、`parseDefinitionText`、`diffDefinitions`、`resolveText`、既定の色・アイコン |
| `values.ts` | 値のセルへの変換と戻し、保存時の正規化、タイムラインの1行の文字列 |
| `type-store.ts` | `customRecordTypes` の読み書き（読み込み・論理削除・復元）と、メモリ上のストア（購読できる） |
| `data.ts` | 記録の CRUD と `createCustomModuleData(type)`（`RecordModuleData`）、`RecordTypes` の同期設定 |
| `summary.ts` | 期間のまとめの集計（純粋な関数） |
| `custom-form.tsx` | 定義から作る入力フォーム |
| `module.tsx` | `createCustomModule(type)`（`RecordModule`）。カード、履歴、まとめのカードも含む |
| `ai-guide.ts` | 「AI に渡す説明」の文章（日本語・英語） |
| `components/custom-types-settings.tsx` | 設定の読み込み・書き出し・削除・復元・説明のコピー |
| `components/import-definition-dialog.tsx` | 読み込みのダイアログ（ファイル・貼り付け、確認、エラー） |

変更するファイル:

| ファイル | 変更 |
| --- | --- |
| `src/features/modules/types.ts` | 表示名・アイコンを広げる（Task 2） |
| `src/features/modules/module-text.tsx`（新規） | `moduleLabel`、`moduleDescription`、`moduleEditTitle`、`ModuleIcon`（Task 2） |
| 表示名・アイコンを使う部品 | `add-record-menu.tsx`、`module-record-dialog.tsx`、`module-settings-section.tsx`、`history-module-tabs.tsx`、`metric-graph-view.tsx`、`data-management.tsx`（Task 2） |
| `src/features/storage/app-db.ts` | version 17（Task 3） |
| `src/features/storage/db-init-provider.tsx` | 起動時にストアを読み込む（Task 3） |
| `src/features/modules/data-registry.ts`、`registry.ts` | 動的にする（Task 6） |
| `src/features/modules/module-settings.ts`、`use-module-settings.ts` | `custom:` の ID を保つ。ストアの変更を購読する（Task 6） |
| `src/features/sync/sync-config.ts`、`sync-engine.ts`、`SyncProvider.tsx` | `RecordTypes` を先に同期する。テーブルの重複を除く。タブ名の表示（Task 7） |
| `src/features/storage/clear-all-records.ts` | テーブルの重複を除く（Task 6） |
| `src/features/settings/components/settings-screen.tsx` | 設定の部品を置く（Task 9） |
| `docs/custom-record-definitions.md`（新規） | コードを読む AI 向けの説明（Task 8） |

---

### Task 1: 定義の型と検査

**Files:**
- Create: `src/features/modules/custom/definition.ts`
- Test: `src/features/modules/custom/definition.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type LocalizedText = string | Record<string, string>;
  export type ChoiceOption = { id: string; label: LocalizedText };
  type FieldBase = { id: string; label: LocalizedText; required: boolean };
  export type CustomField =
    | (FieldBase & { type: "number"; unit?: string; min?: number; max?: number; step?: number })
    | (FieldBase & { type: "scale"; levels: number; lowLabel?: LocalizedText; highLabel?: LocalizedText })
    | (FieldBase & { type: "choice" | "multiChoice"; options: ChoiceOption[] })
    | (FieldBase & { type: "boolean" | "text" });
  export type CustomRecordDefinition = {
    exerlogRecordType: 1; id: string; name: LocalizedText; icon: string; color: string;
    description?: LocalizedText; fields: CustomField[];
  };
  export type DefinitionErrorCode =
    | "not_json" | "not_object" | "unsupported_version" | "bad_id" | "missing_name"
    | "no_fields" | "bad_field_id" | "reserved_field_id" | "duplicate_field_id"
    | "bad_field_type" | "missing_label" | "no_options" | "bad_option_id"
    | "duplicate_option_id" | "bad_number" | "bad_levels" | "type_changed";
  export type DefinitionError = { code: DefinitionErrorCode; path: string; value?: string };
  export type ParseResult = { ok: true; definition: CustomRecordDefinition } | { ok: false; errors: DefinitionError[] };
  export function parseDefinitionText(text: string): ParseResult;
  export function parseDefinition(input: unknown): ParseResult;
  export type DefinitionDiff = { added: string[]; removed: string[]; typeChanged: string[] };
  export function diffDefinitions(prev: CustomRecordDefinition, next: CustomRecordDefinition): DefinitionDiff;
  export function resolveText(text: LocalizedText | undefined, language: string): string;
  export const FIXED_COLUMNS: readonly ["id", "date", "recordedAt", "note", "updatedAt"];
  export const DEFAULT_ICON = "📝";
  export function defaultColor(id: string): string;
  ```

- [ ] **Step 1: 失敗するテストを書く**

  テストは次のものを作る。
  - `accepts the protein sample`: Global Constraints の JSON を `parseDefinitionText` に渡すと `ok: true` になる。`required` を省いた項目は `false`、`scale` の `levels` は 5 になる。
  - `fills defaults`: `icon`、`color` を省くと、`icon === "📝"` になる。`color` は `defaultColor("protein")` と同じで、`/^#[0-9a-f]{6}$/` に合う。
  - `accepts JSON wrapped in a code fence or prose`: `` "はい、どうぞ。\n```json\n{...}\n```\n使ってください" `` も `ok: true` になる。
  - `reports every problem with a path`: `id: "Protein!"`、項目 `{ id: "note", type: "number", label: "x" }`、`{ id: "a", type: "choice", label: "x", options: [] }`、`{ id: "b", type: "date", label: "x" }` を与える。エラーには、少なくとも次が入る。
    - `{ code: "bad_id", path: "id" }`
    - `{ code: "reserved_field_id", path: "fields[0].id" }`
    - `{ code: "no_options", path: "fields[1].options" }`
    - `{ code: "bad_field_type", path: "fields[2].type", value: "date" }`
  - `rejects duplicates`: 項目 ID の重複は `duplicate_field_id`、選択肢 ID の重複は `duplicate_option_id` になる。
  - `rejects bad numbers`: `min > max` は `bad_number`、`levels: 11` は `bad_levels` になる。
  - `rejects unsupported version`: `exerlogRecordType: 2` は `unsupported_version` になる。
  - `diffDefinitions`: `amount` を `choice` に変え、`brand` を消し、`memo`（text）を足す。結果は `{ added: ["memo"], removed: ["brand"], typeChanged: ["amount"] }`。`choice` から `multiChoice` に変えた場合も `typeChanged` に入る。
  - `resolveText`: `resolveText({ en: "Protein", ja: "プロテイン" }, "ja") === "プロテイン"`。`resolveText({ en: "Protein" }, "ja") === "Protein"`。`resolveText("量", "en") === "量"`。`resolveText(undefined, "ja") === ""`。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/definition.test.ts`
  Expected: FAIL（モジュールがない）

- [ ] **Step 3: `definition.ts` を実装する**

  - `parseDefinitionText` は、まずそのまま `JSON.parse` を試す。失敗したら、最初の `{` から最後の `}` までを切り出して、もう一度試す。それでも失敗したら `not_json` を返す。
  - エラーは最初の1つで止めず、全部集めて返す。
  - `path` は `fields[0].options[1].id` の形にする。
  - `defaultColor` は、ID の文字コードの和を、固定の8色の候補の数で割った余りで選ぶ。候補は、既存のモジュールの色と同じくらいの彩度にする。

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/modules/custom/definition.test.ts`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add src/features/modules/custom/definition.ts src/features/modules/custom/definition.test.ts
  git commit -m "feat(custom): parse and validate record-type definitions"
  ```

---

### Task 2: モジュールの表示名とアイコンを、定義の文字列と絵文字にも対応させる

既存の動きを変えない下ごしらえ。既存のテストがすべて通ったままであることが合格の条件になる。

**Files:**
- Modify: `src/features/modules/types.ts`
- Create: `src/features/modules/module-text.tsx`
- Modify:
  - `src/features/modules/components/add-record-menu.tsx`
  - `src/features/modules/components/module-record-dialog.tsx`
  - `src/features/modules/components/module-settings-section.tsx`
  - `src/features/history/components/history-module-tabs.tsx`
  - `src/features/history/components/metric-graph-view.tsx`
  - `src/features/settings/components/data-management.tsx`
- Test: `src/features/modules/module-text.test.tsx`

**Interfaces:**
- Produces（`types.ts`）:
  ```ts
  /** How a module names itself: i18n keys (code modules) or literal text (custom modules). */
  export type ModuleNaming =
    | { kind: "keys"; labelKey: keyof Messages; descriptionKey: keyof Messages; editTitleKey: keyof Messages; icon: LucideIcon }
    | { kind: "text"; label: LocalizedText; description?: LocalizedText; emoji: string };
  // RecordModule: labelKey / descriptionKey / editTitleKey / icon を消して naming: ModuleNaming を足す。
  // さらに isCustom?: boolean（設定の「カスタム」の印）と hidden?: boolean（論理削除。画面の一覧から外す）を足す。
  // RecordModuleData.csv: exportLabelKey を exportLabel: { key: keyof Messages } | { text: LocalizedText } に変える。
  ```
- Produces（`module-text.tsx`）:
  ```ts
  type T = ReturnType<typeof useTranslation>["t"];
  export function moduleLabel(module: RecordModule, t: T, language: string): string;
  export function moduleDescription(module: RecordModule, t: T, language: string): string;
  /** keys: t(editTitleKey)。text: t("custom_edit_title", { name: ラベル }) */
  export function moduleEditTitle(module: RecordModule, t: T, language: string): string;
  export function csvExportLabel(data: RecordModuleData, t: T, language: string): string;
  export function ModuleIcon(props: { module: RecordModule; className?: string }): JSX.Element;
  ```
- Produces（`metric-graph-view.tsx`）: `GraphMetric` を `{ key; labelKey?: keyof Messages; label?: string; load }` に広げる（どちらか一方が必ずある）。`HistoryTab` も `label?: string` を持てるようにする。

- [ ] **Step 1: 失敗するテストを書く**

  `module-text.test.tsx`:
  - `moduleLabel` が、`keys` のモジュールでは `t(labelKey)` を返す。`text` のモジュールでは、表示言語の文字列を返す。
  - `ModuleIcon` が、`text` のモジュールでは絵文字を `aria-hidden` の `span` で描く。`keys` のモジュールでは lucide のアイコンを、モジュールの色で描く。
  - `moduleEditTitle` が、`text` のモジュールでは `「プロテイン」を編集`（`custom_edit_title` の日本語）を返す。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/module-text.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 型を変えて、既存の8モジュールと使っている部品を書き換える**

  - 既存のモジュールは `naming: { kind: "keys", ... }` に移す。値は今の `labelKey` などをそのまま使う。
  - 部品は `t(module.labelKey)` などをやめて、`moduleLabel` などを使う。
  - i18n に `custom_edit_title`（ja: `「{name}」を編集`、en: `Edit {name}`）を足す。

- [ ] **Step 4: 全テストと型検査を通す**

  Run: `npx tsc --noEmit && npx vitest run`
  Expected: 型エラーなし、全テスト PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add -A src/features
  git commit -m "refactor(modules): name modules by i18n key or literal text, icon by lucide or emoji"
  ```

---

### Task 3: 定義の保存とストア

**Files:**
- Modify: `src/features/storage/app-db.ts`（version 17 で `customRecords` と `customRecordTypes` を足す）
- Create: `src/features/modules/custom/type-store.ts`
- Modify: `src/features/storage/db-init-provider.tsx`
- Test: `src/features/modules/custom/type-store.test.ts`

**Interfaces:**
- Consumes: Task 1 の `CustomRecordDefinition` と `diffDefinitions`。
- Produces:
  ```ts
  export type CustomRecordType = { id: string; definition: CustomRecordDefinition; deleted: boolean; updatedAt: string };
  export type CustomRecord = ModuleRecord & {
    typeId: string; values: Record<string, CustomValue>; note: string; updatedAt: string;
  };
  export type CustomValue = number | string | string[] | boolean;
  // ↑ CustomRecordType / CustomRecord / CustomValue は src/lib/types.ts に置く（app-db.ts から参照するため）

  export type ImportPlan = { kind: "new" | "update" | "restore"; definition: CustomRecordDefinition; diff: DefinitionDiff | null };
  /** 種類の変更があるときは { ok: false, errors: [{ code: "type_changed", path: `fields.${id}` }] } */
  export function planImport(definition: CustomRecordDefinition): Promise<{ ok: true; plan: ImportPlan } | { ok: false; errors: DefinitionError[] }>;
  export function saveImportedDefinition(definition: CustomRecordDefinition): Promise<void>; // deleted=false, updatedAt=localIsoNow(), scheduleSync()
  export function markTypeDeleted(id: string, deleted: boolean): Promise<void>;           // updatedAt を更新、scheduleSync()
  export function loadCustomTypes(): Promise<void>;          // Dexie → メモリ。変わったときだけ購読者に知らせる
  export function getCustomTypes(): readonly CustomRecordType[]; // id 順。削除済みも含む。同じ内容のあいだは同じ配列を返す
  export function subscribeCustomTypes(listener: () => void): () => void;
  ```
  `saveImportedDefinition` と `markTypeDeleted` は、書いたあとで `loadCustomTypes()` を呼ぶ。

- [ ] **Step 1: 失敗するテストを書く**

  テストは `scheduleSync` をモックする（既存のテストと同じ形）。
  - `planImport` は、次のように判定する。
    - 初めての ID なら `new`。
    - 保存済みの ID なら `update` で、`diff` も返す。
    - 削除済みの ID なら `restore`。
    - 種類を変えた項目があれば `ok: false` で、エラーは `type_changed`。
  - `saveImportedDefinition` のあと、`getCustomTypes()` にその定義が入っていて、`deleted === false`。購読者が1回呼ばれる。
  - `markTypeDeleted("protein", true)` のあと、`getCustomTypes()` の要素の `deleted` が `true`。tombstone は増えない。
  - `getCustomTypes()` は、`loadCustomTypes()` を続けて2回呼んでも、中身が同じなら同じ配列を返す（`toBe`）。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/type-store.test.ts`
  Expected: FAIL

- [ ] **Step 3: 実装する**

  - Dexie の version 17 は、version 16 の stores をすべて写し、`customRecords` と `customRecordTypes` を足す。
  - `DbInitProvider` の `useEffect` の中で、`void loadCustomTypes().catch(console.error)` を呼ぶ。画面の表示は待たない（読み込みが済めば、購読している部品が描き直す）。

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/modules/custom/type-store.test.ts`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add src/lib/types.ts src/features/storage/app-db.ts src/features/storage/db-init-provider.tsx src/features/modules/custom/type-store.ts src/features/modules/custom/type-store.test.ts
  git commit -m "feat(custom): store record-type definitions with soft delete"
  ```

---

### Task 4: カスタム記録のデータ層

**Files:**
- Create: `src/features/modules/custom/values.ts`
- Create: `src/features/modules/custom/data.ts`
- Test: `src/features/modules/custom/values.test.ts`, `src/features/modules/custom/data.test.ts`

**Interfaces:**
- Consumes: Task 1 と Task 3 の型。
- Produces（`values.ts`）:
  ```ts
  export function encodeCell(value: CustomValue | undefined): string;
  /** field が undefined（消した項目）のときは、空でなければ生の文字列のまま返す */
  export function decodeCell(field: CustomField | undefined, raw: string): CustomValue | undefined;
  /** 定義の項目の値は、種類に合うものだけを残す（空の文字列・空の配列・NaN は落とす）。定義にない ID の値は、そのまま残す */
  export function normalizeValues(definition: CustomRecordDefinition, values: Record<string, unknown>): Record<string, CustomValue>;
  /** "30 g・ホエイ・トレ後"。区切りは t("sep_dot") を使う */
  export function formatRecordLine(definition: CustomRecordDefinition, record: CustomRecord, language: string, sep: string): string;
  ```
  `formatRecordLine` の決まり:
  - 値のある項目だけを、定義の順に並べる。
  - `number`: 単位があれば `30 g`。単位がなければ `ラベル 30`。
  - `scale`: `ラベル 3/5`。
  - `choice` / `multiChoice`: 選択肢のラベル（`multiChoice` は `、` でつなぐ）。定義にない選択肢 ID は、ID のまま出す。
  - `boolean`: true ならラベル、false なら出さない。
  - `text`: 値そのもの。
  - 消した項目は出さない。
- Produces（`data.ts`）:
  ```ts
  export function customModuleId(typeId: string): string;   // "custom:" + typeId
  export function customTabName(typeId: string): string;    // "Custom_" + typeId
  export type CustomRecordInput = Pick<CustomRecord, "date" | "recordedAt" | "values" | "note">;
  export function addCustomRecord(definition: CustomRecordDefinition, input: CustomRecordInput): Promise<CustomRecord>;
  /** 保存済みの記録の、定義にない ID の値は残す（normalizeValues の上に、元の記録の消した項目の値を重ねる） */
  export function updateCustomRecord(definition: CustomRecordDefinition, record: CustomRecord): Promise<void>;
  export function deleteCustomRecord(typeId: string, id: string): Promise<void>;
  export function listCustomInRange(typeId: string, start: string, end: string): Promise<CustomRecord[]>;
  export function createCustomModuleData(type: CustomRecordType): RecordModuleData<CustomRecord>;
  export const recordTypesSyncConfig: TableSyncConfig; // タブ RecordTypes
  ```
  `createCustomModuleData` の中身:
  - `id` は `customModuleId(type.id)`。
  - `tables` は `[appDb.customRecords]`。
  - 一覧（`listForDay`、`listInPeriod`、`datesWithRecordsInMonth`、`count`、`clearAll`）は、どれも `typeId` で絞る。`[typeId+date]` のインデックスを使う。
  - `syncConfigs` は、`byName` で1件。
    - `headers` は固定の列。
    - `buildHeaders` は、固定の列、定義の項目の順、記録にだけある列（名前順）の順に並べる。
    - `readFromDb` と `replaceDb` は、その `typeId` の行だけを読み、その行だけを置き換える。
  - `csv` は、`fileName: custom-<id>.csv` と `exportLabel: { text: definition.name }`。列はシートと同じにする（`updatedAt` を除く）。
  - `recordTypesSyncConfig` は、`updatedAtKey: "updatedAt"`、`deletable: true`、`replaceDb: replaceTable(appDb.customRecordTypes, …)`。`fromRow` で `parseDefinition` に通らない行は、捨てずにそのまま入れる。ストアの側で使えないものとして飛ばす。

- [ ] **Step 1: 失敗するテストを書く**

  `values.test.ts`:
  - `encodeCell` と `decodeCell` の往復。対象は 6 種類すべてと、`decodeCell(undefined, "abc") === "abc"`、`decodeCell(numberField, "") === undefined`。
  - `normalizeValues` が、`"30"`（文字列）の数値を `30` に、`""` を落とす。定義にない `old: "x"` は残す。
  - `formatRecordLine` が、Global Constraints のサンプルで `{ amount: 30, kind: "whey", timing: ["post"], fasted: false }` を `"30 g・ホエイ・トレ後"` にする。定義から消えた選択肢 `"casein"` は `"casein"` と出る。

  `data.test.ts`（`scheduleSync` をモックする）:
  - `adds, updates and deletes with a tombstone on Custom_protein`。
  - `keeps values of removed fields on update`: `values: { amount: 30, brand: "X" }` の記録を作る。`brand` を消した定義で、`values: { amount: 40 }` にして `updateCustomRecord` する。保存されたものは `{ amount: 40, brand: "X" }` になる。
  - `lists only its own type`: `protein` と `meal` の記録を同じ日に作る。`createCustomModuleData(protein).listForDay(day)` は protein の記録だけを返す。
  - `replaceDb leaves other types alone`: protein の `replaceDb([])` のあとも、meal の記録は残る。
  - `round-trips removed-field columns`: `buildHeaders` は `["id","date","recordedAt","note","updatedAt","amount","kind","timing","fasted","brand","taste","zzOld"]`（`zzOld` は記録にだけある列）になる。その行を `fromRow` に通すと、元の `values`（`zzOld: "v"` を含む）に戻る。
  - `clearAll records tombstones only for its tab`。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/values.test.ts src/features/modules/custom/data.test.ts`
  Expected: FAIL

- [ ] **Step 3: 実装する**

  今の symptoms と selfcare の `data.ts` と同じ形で書く（`localIsoNow`、`recordTombstones`、`scheduleSync`）。

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/modules/custom`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add src/features/modules/custom
  git commit -m "feat(custom): records per definition with byName sheet columns"
  ```

---

### Task 5: 汎用のフォーム・カード・履歴・まとめ

**Files:**
- Create: `src/features/modules/custom/summary.ts`、`src/features/modules/custom/custom-form.tsx`、`src/features/modules/custom/module.tsx`
- Modify: `src/features/modules/wellness/wellness-score-input.tsx`（段階の数と両端の言葉を受け取れるようにする。体調からの呼び方は変えない）
- Test: `src/features/modules/custom/summary.test.ts`、`src/features/modules/custom/custom-form.test.tsx`、`src/features/modules/custom/module.test.tsx`

**Interfaces:**
- Consumes: Task 2 の `ModuleNaming`、Task 4 の `createCustomModuleData`、`addCustomRecord`、`updateCustomRecord`、`deleteCustomRecord`、`formatRecordLine`。
- Produces:
  ```ts
  // summary.ts
  export type CustomSummary = {
    count: number;
    numeric: { fieldId: string; avg: number; min: number; max: number }[];  // number と scale。値が1つもない項目は入れない
    choices: { fieldId: string; counts: { optionId: string; count: number }[] }[]; // 多い順、同じ数なら定義の順
  };
  export function summarizeCustomRecords(definition: CustomRecordDefinition, records: CustomRecord[]): CustomSummary | null; // 0件なら null
  // module.tsx
  export function createCustomModule(type: CustomRecordType): RecordModule<CustomRecord>;
  ```
  `createCustomModule` の中身:
  - `naming` は `{ kind: "text", label: name, description, emoji: icon }`。
  - `color` は定義の色。`isCustom` は true。`hidden` は `type.deleted`。`tags` はなし（初めは ON）。
  - `Form` は `CustomRecordForm`。
  - `TimelineCard` は、1行目が `formatRecordLine` の結果と `TimeLabelTag`、2行目がメモ。
  - `HistoryView` は、数値・段階スコアの項目があれば上に `MetricGraphView` を出す（項目ごとに1つの `GraphMetric`、`label` に項目名）。その下に、`RangeSummaryView` で期間内の記録を新しい順の一覧で出す（`M/D HH:mm` と `formatRecordLine`）。
  - `SummaryCard` は、`SummaryCardFrame` の中に、件数、数値の「平均・最小・最大」、選択肢の回数を出す。

- [ ] **Step 1: 失敗するテストを書く**

  - `summary.test.ts`: amount が 20、30、40 の3件なら、`{ fieldId: "amount", avg: 30, min: 20, max: 40 }` になる。`kind` が whey×2、soy×1 なら `counts` は `[{whey,2},{soy,1}]` になる。0件なら `null`。
  - `custom-form.test.tsx`（`renderWithLanguage` を使う）:
    - サンプルの定義で、次の入力部品が出る。
      - 量（`spinbutton`）
      - 種類（`radio` が2つ）
      - タイミング（`checkbox` が2つ）
      - 空腹時（`switch`）
      - 銘柄（`textbox`）
      - おいしさ（ボタン5つ）
      - メモ
    - `amount` を空のまま保存すると保存されず、「必須です」の表示が出る。
    - 30 を入れて「ホエイ」を選んで保存すると、`appDb.customRecords` に `{ amount: 30, kind: "whey" }` の記録が1件できて、`onSaved` が呼ばれる。
    - 編集のとき、定義にない値（`brand`）は画面に出ない。保存しても残る。
  - `module.test.tsx`: `createCustomModule(type)` の `TimelineCard` が `30 g・ホエイ・トレ後` を描く。`HistoryView` が、項目名「量」のグラフの選択肢を出す。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

  - フォームの部品は、既存のフォームから流用する。
    - `TimeField`、`FIELD_CLASS`、`TimelineDialogFooter`、`useSaveAndClose`
    - 選択肢のチップは、セルフケアのフォームと同じクラスにする。
    - 段階スコアは、広げた `WellnessScoreInput` を使う。
  - 項目の上限・下限・刻みは、`input` の `min`、`max`、`step` に渡す。範囲の外は保存しない（必須と同じ出し方）。
  - i18n のキー:
    - `custom_required`（必須です／Required）
    - `custom_out_of_range`（{min}〜{max} で入れてください）
    - `custom_summary_count`（{count}件）
    - `custom_summary_numeric`（平均 {avg}・最小 {min}・最大 {max}）

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/modules`
  Expected: PASS（体調のスコア入力の既存のテストも含む）

- [ ] **Step 5: コミットする**

  ```bash
  git add src/features/modules src/features/i18n/messages
  git commit -m "feat(custom): generated form, timeline card, history view and summary card"
  ```

---

### Task 6: 動的なレジストリと設定

**Files:**
- Modify: `src/features/modules/data-registry.ts`、`src/features/modules/registry.ts`、`src/features/modules/module-settings.ts`、`src/features/modules/use-module-settings.ts`、`src/features/storage/clear-all-records.ts`、`src/features/sync/sync-config.ts`（`syncedDbTables` に `customRecordTypes` を足し、重複を除く）
- Modify: `registry.ts` を使っていたところ（`RECORD_MODULES` → `recordModules()`）
- Test: `src/features/modules/registry.test.ts`、`src/features/modules/module-settings.test.ts`、`src/features/modules/custom/registry-integration.test.ts`

**Interfaces:**
- Consumes: Task 3 の `getCustomTypes` と `subscribeCustomTypes`、Task 4 の `createCustomModuleData`、Task 5 の `createCustomModule`。
- Produces:
  ```ts
  // data-registry.ts
  export function recordModuleData(): readonly RecordModuleData[]; // コード8つ + getCustomTypes() のうち定義が読めたもの（削除済みを含む）。ストアの配列が同じなら同じ配列を返す
  export function getModuleData(id: string): RecordModuleData | undefined;
  // registry.ts
  export function recordModules(): readonly RecordModule[];        // 同じ順と同じ data。RECORD_MODULES 定数は消す
  export function getRecordModule(id: string): RecordModule | undefined;
  // module-settings.ts
  // resolveModuleSettings: 保存されている order と disabled の中の "custom:" で始まる ID は、レジストリになくても捨てない（位置もそのまま）
  // use-module-settings.ts
  // subscribe は、設定とカスタムストアの両方を購読する。entries は hidden のモジュールを除く
  export function useDeletedCustomTypes(): readonly CustomRecordType[]; // 設定の「削除した定義」用
  ```

- [ ] **Step 1: 失敗するテストを書く**

  - `module-settings.test.ts` に `keeps custom ids that are not loaded yet` を足す。
    - 保存値は `{ order: ["wellness","custom:protein","body"], disabled: ["custom:protein"] }`。
    - レジストリの ID は `["wellness","body"]`。
    - 結果の `order` は `["wellness","custom:protein","body", ...残り]`、`disabled` は `["custom:protein"]` になる。
    - レジストリにない `custom:` 以外の ID は、今までどおり捨てられる。
  - `registry-integration.test.ts`（`scheduleSync` をモックする）:
    - `saveImportedDefinition(protein)` のあと、`recordModules()` の最後が `custom:protein` で、その `data` は `recordModuleData()` の最後と同じオブジェクトになる。
    - `includes deleted types in data operations`:
      - 記録を1件作り、`markTypeDeleted("protein", true)` する。
      - `recordModuleData()` には `custom:protein` が残る。`getRecordModule("custom:protein")?.hidden === true`。
      - `countAllRecords()` はその1件を数える。
      - `clearAllRecords()` のあと、`appDb.customRecords.count() === 0` になり、`Custom_protein` の tombstone ができる。
      - `tableSyncConfigs()` のタブ名に `Custom_protein` と `RecordTypes` が入る。
    - `syncedDbTables()` に、同じテーブルが2回入らない（protein と meal の2つを読み込んだ状態で、名前が重複しない）。
  - `registry.test.ts`: 既存のテストの `RECORD_MODULES` を `recordModules()` に書き換える。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules src/features/storage`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

  - `recordModuleData()` と `recordModules()` は、`getCustomTypes()` の配列を鍵にしてキャッシュする。カスタムのモジュールのオブジェクトは、定義 ID と `updatedAt` が同じあいだは同じものを使い回す。
  - `recordModules()` のカスタムのモジュールの `data` は、`recordModuleData()` のものと同じオブジェクトにする。
  - `tableSyncConfigs()` では、`recordTypesSyncConfig` をモジュールの設定の前に置く。
  - `sync-tab-keys.test.ts` が落ちないよう、`sync_tab_RecordTypes`（記録の種類／Record types）を足す。

- [ ] **Step 4: 全テストと型検査を通す**

  Run: `npx tsc --noEmit && npx vitest run`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add -A src/features
  git commit -m "feat(custom): registry includes imported record types; settings keep their order before load"
  ```

---

### Task 7: 同期の順番

**Files:**
- Modify: `src/features/sync/sync-engine.ts`、`src/features/sync/SyncProvider.tsx`
- Test: `src/features/sync/sync-engine.test.ts`（既存のファイルに足す。Google の API のモックは既存のテストのやり方に合わせる）

**Interfaces:**
- Consumes: Task 3 の `loadCustomTypes`、Task 4 の `recordTypesSyncConfig` と `customTabName`、Task 6 の `tableSyncConfigs()`。
- Produces: `doSyncAll` の順番を次のようにする。
  1. Tombstones
  2. ファイルの同期
  3. `RecordTypes`
  4. `await loadCustomTypes()`
  5. `ensureSheetTabs(sheetTabs())`。タブが増えたときだけ。失敗したらその結果をエラーとして積み、そのまま進む。
  6. 改めて `tableSyncConfigs()` を作り、Tombstones と RecordTypes 以外を同期する。

  `SyncProvider` の `tabLabel` は、`Custom_<id>` のときに、ストアの定義名（表示言語）を返す。

- [ ] **Step 1: 失敗するテストを書く**

  - `pulls a remote definition and its records in one run`:
    - 端末にはカスタムの定義も記録もない。
    - シートの `RecordTypes` に protein の行があり、`Custom_protein` に記録が1行ある。
    - `syncAll` のあと、`appDb.customRecordTypes` に protein が入り、`appDb.customRecords` に1件入る。
    - `ensureSheetTabs` が、`Custom_protein` を含むタブの一覧で呼ばれている。
  - `skips a records tab whose definition is unknown`: シートに `Custom_meal` だけがあり（定義はない）、同期のあと `Custom_meal` は読まれも書かれもしない。
  - `keeps syncing a deleted type`: 削除済みの protein の記録が、`Custom_protein` に書かれる。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/sync`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/sync`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add src/features/sync
  git commit -m "feat(sync): sync record types before their record tabs"
  ```

---

### Task 8: AI に渡す説明

**Files:**
- Create: `src/features/modules/custom/ai-guide.ts`、`docs/custom-record-definitions.md`
- Test: `src/features/modules/custom/ai-guide.test.ts`

**Interfaces:**
- Consumes: Task 1 の `parseDefinitionText`。
- Produces:
  ```ts
  export const SAMPLE_DEFINITION: CustomRecordDefinition; // Global Constraints のプロテインの例
  export function buildAiGuide(language: "ja" | "en"): string;
  ```
  説明には、次の内容を含める。
  - 目的（ExerLog に記録の種類を足す定義を作る）
  - 形式の版
  - キーの一覧と省略できるもの
  - 6種類の項目と、種類ごとの設定
  - ID の決まり（使えない項目 ID も）
  - 「項目の種類を変えたいときは、別の項目 ID にする」
  - 完全なサンプル（`JSON.stringify(SAMPLE_DEFINITION, null, 2)`）
  - 「JSON だけを出力する」という指示
  - 末尾の行 `記録したいもの: `（en: `What I want to record: `）

- [ ] **Step 1: 失敗するテストを書く**

  - `the sample in the guide is accepted`: `buildAiGuide("ja")` の中の、最初の ```` ```json ```` の囲みの中身を `parseDefinitionText` に通すと `ok: true` になる。`en` も同じ。
  - `mentions every field type and reserved id`: 6つの種類名と、`id`、`date`、`recordedAt`、`note`、`updatedAt` が、本文にすべて含まれる。
  - `ends with the prompt line`: `buildAiGuide("ja").trimEnd().endsWith("記録したいもの:")` が真。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/ai-guide.test.ts`
  Expected: FAIL

- [ ] **Step 3: 実装する**

  `docs/custom-record-definitions.md` には、次のことを書く。
  - `buildAiGuide("ja")` と同じ内容
  - コードを読む AI のための補足
    - 保存先（`customRecords`、`Custom_<id>`）
    - 「機能を足したいならコードのモジュールにする」という役割の分担

- [ ] **Step 4: テストが通ることを確認する**

  Run: `npx vitest run src/features/modules/custom/ai-guide.test.ts`
  Expected: PASS

- [ ] **Step 5: コミットする**

  ```bash
  git add src/features/modules/custom/ai-guide.ts src/features/modules/custom/ai-guide.test.ts docs/custom-record-definitions.md
  git commit -m "feat(custom): copyable guide for AI-written definitions"
  ```

---

### Task 9: 設定の画面（読み込み・書き出し・削除・復元・説明のコピー）

**Files:**
- Create: `src/features/modules/custom/components/import-definition-dialog.tsx`、`src/features/modules/custom/components/custom-types-settings.tsx`
- Modify: `src/features/modules/components/module-settings-section.tsx`（カスタムの行に「カスタム」の印と「⋯」のドロップダウン）、`src/features/settings/components/settings-screen.tsx`（`ModuleSettingsSection` の下に `CustomTypesSettings` を置く）
- Test: `src/features/modules/custom/components/import-definition-dialog.test.tsx`、`src/features/modules/custom/components/custom-types-settings.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `parseDefinitionText`、Task 3 の `planImport`、`saveImportedDefinition`、`markTypeDeleted`、Task 6 の `useDeletedCustomTypes`、Task 8 の `buildAiGuide`。
- Produces（画面の動き）:
  - **「＋ 定義を読み込む」**: ダイアログを開く。中身は「ファイルを選ぶ」（`accept="application/json,.json"`）と、貼り付け用の `textarea`。「確認」を押すと、`parseDefinitionText` から `planImport` まで進む。
    - エラーのとき: 1行に1つずつ、`custom_def_error_<code>` の文言で出す（`{path}` と `{value}` を埋める）。「エラーをコピー」ボタンで、その一覧をクリップボードに入れる（AI に貼って直させるため）。
    - 通ったとき: 次のものを出し、「読み込む」で `saveImportedDefinition` する。
      - 新規・更新・復元の区別
      - 絵文字と名前
      - 項目の一覧（足される項目には「追加」、なくなる項目には「非表示（データは残ります）」の印）
  - **カスタムの行の「⋯」**（ドロップダウン）:
    - 「定義を書き出す」: `exerlog-<id>.json` をダウンロードする（`JSON.stringify(definition, null, 2)`。今の CSV と同じ Blob の方式）。
    - 「定義を削除」: 確認を出し、`markTypeDeleted(id, true)` する。確認の文言は「記録は消えません。同じ定義を読み込むと元に戻ります」。
  - **「削除した定義」**: 1件以上あるときだけ、折りたたんで出す。各行に「元に戻す」（`markTypeDeleted(id, false)`）。
  - **「AI に渡す説明をコピー」**: `buildAiGuide(language)` をクリップボードに入れ、「コピーしました」を2秒出す。クリップボードが使えないときは、説明を選択済みの `textarea` で出す。

- [ ] **Step 1: 失敗するテストを書く**

  - `import-definition-dialog.test.tsx`:
    - サンプルの JSON を貼って「確認」を押すと、「新規」と「🥤 プロテイン」と6つの項目名が出る。「読み込む」で `getCustomTypes()` に入る。
    - `{"id":"Bad!"}` を貼ると、`custom_def_error_bad_id` の文言と `custom_def_error_no_fields` の文言が出て、「読み込む」は出ない。
    - 保存済みの protein から `brand` を消した JSON は、「更新」と表示され、銘柄の行に「非表示（データは残ります）」が付く。
    - `amount` の種類を変えた JSON は、`custom_def_error_type_changed` の文言が出る。
  - `custom-types-settings.test.tsx`:
    - 「AI に渡す説明をコピー」で、`navigator.clipboard.writeText` が `buildAiGuide("ja")` で呼ばれる。
    - 削除済みの定義があると「削除した定義」が出る。「元に戻す」で `deleted` が false になる。
  - `module-settings-section.test.tsx` に足す: カスタムの行に「カスタム」の印がある。「⋯」から「定義を削除」を選んで確認すると、その行が一覧から消える。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

  i18n に足すもの:
  - 画面の文言（`custom_import_*`、`custom_export`、`custom_delete*`、`custom_deleted_*`、`custom_copy_guide*`、`custom_badge`）
  - `custom_def_error_<code>` の全コード（Task 1 の `DefinitionErrorCode` すべて）

  文言は、AI に貼ればそのまま直せる具体さにする。例: 「fields[0].id: "note" は予約された名前なので使えません。別の名前にしてください」。

- [ ] **Step 4: 全テスト・型検査・lint・ビルドを通す**

  Run: `npx tsc --noEmit && npx vitest run && npm run lint && npm run build`
  Expected: すべて成功

- [ ] **Step 5: コミットする**

  ```bash
  git add -A src/features docs
  git commit -m "feat(custom): import, export, delete and restore record types in settings"
  ```

---

### Task 10: 実機での確認

- [ ] **Step 1: `npm run dev` で開き、次を順に確かめる**

  1. 設定の「AI に渡す説明をコピー」で説明をコピーし、末尾に「プロテインを飲んだ時刻と量」と書き足す。それを AI に渡して JSON を作らせる（手元で用意したサンプルでもよい）。
  2. その JSON を貼って読み込む。「＋記録する」に出ること、入力・保存・タイムラインの表示・編集・削除を確かめる。
  3. 履歴のチップ、グラフ、一覧、カレンダーの印、期間のまとめ、CSV 書き出しを確かめる。
  4. 定義の書き出しで出たファイルを、別のブラウザのプロファイルで読み込めることを確かめる。
  5. 定義を削除する。画面から消えること、「削除した定義」から元に戻せること、記録が残っていることを確かめる。
  6. Google 同期を ON にして同期する。スプレッドシートに `RecordTypes` と `Custom_protein` のタブができることを確かめる。別のプロファイルで同期すると、定義と記録が入ってくることを確かめる。

- [ ] **Step 2: 見つかった問題を直し、テストを足してコミットする**
