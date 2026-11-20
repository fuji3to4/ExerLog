# 標準の定義（体調・身体・セルフケア・胸囲・腹囲）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 体調・身体・セルフケア・胸囲・腹囲のコードのモジュールをなくし、最初から端末に入っているカスタム記録（標準の定義）にする。同じ ID の定義を読み込むとその場で作り変えられ、「初期の定義に戻す」で元に戻せる。削除はできない。身体の体重・身長は変えられず、BMI は今と同じ場所に出る。

**Architecture:**
- 標準の定義の中身・ID・タグ・固定日時・変えられない項目は、1つのファイル `custom/builtin.ts` にまとめる。今の `custom/templates.ts` はこれに置き換える。
- レジストリは、標準の4つを**ストアの読み込みを待たずに**いつも持つ。端末に行があればその定義を、なければ同梱の定義を使う。モジュール ID は `custom:` なしの `wellness`・`body`・`selfcare`・`girth` にする。
- 端末への入れ方、作り変えの判定、削除の禁止、初期に戻す処理は `type-store.ts` に足す。
- BMI は、`createCustomModule` に足す「追加の表示」（`extras`）として身体だけに差し込む。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4、Recharts、Vitest + fake-indexeddb + Testing Library。新しい依存は入れない。

**Spec:** `docs/superpowers/specs/2026-11-20-builtin-record-definitions-design.md`
（前提の設計書：`docs/superpowers/specs/2026-11-10-custom-record-definitions-design.md`）

## Global Constraints

- **標準の定義 ID とモジュール ID**：`wellness`・`body`・`selfcare`・`girth`。モジュール ID は定義 ID と同じで、`custom:` を付けない。
- **レジストリの並び**：`wellness, body, girth, circumference, photo, selfcare, compression, symptoms`、そのあとにユーザーのカスタム記録。今の並びと同じ。
- **タグ**：`selfcare` だけが `["lymphedema"]`。ほかの標準の定義にはタグがない。
- **データの置き場所**：`customRecords`（`typeId` は定義 ID）。シートのタブは `Custom_wellness`・`Custom_body`・`Custom_selfcare`・`Custom_girth`。定義は `RecordTypes` タブ。
- **固定日時**：`BUILTIN_SEED_UPDATED_AT = "2000-01-01T00:00:00+00:00"`。これまでに出した固定日時の一覧 `KNOWN_SEED_UPDATED_ATS` は、今はこの1つだけ。
- **身体の変えられない項目**：`weight`（数値、単位 `kg`）、`height`（数値、単位 `cm`）。エラーコードは `locked_field`。
  - ja：`{path}: 体重（weight）と身長（height）は BMI の計算に使うので、消したり種類や単位を変えたりできません`
  - en：`{path}: weight and height are used for BMI, so they cannot be removed or change their type or unit`
- **標準の定義の中身**
  - 体調・セルフケア：今の `templates.ts` のとおり。
  - 身体：名前 `module_body_label` / 説明 `module_body_description`（日英）、アイコン `⚖️`、色 `#7a4fb0`。項目は次の3つで、どれも任意。
    - `weight`：数値、`kg`、1〜500、刻み 0.1、ラベル `measurement_item_weight`
    - `bodyFat`：数値、`%`、1〜99、刻み 0.1、ラベル `measurement_item_body_fat`
    - `height`：数値、`cm`、30〜300、刻み 0.1、ラベル `measurement_item_height`
  - 胸囲・腹囲：名前 `module_girth_label` / 説明 `module_girth_description`、アイコン `📏`、色 `#8a6d1f`。項目は次の2つで、どちらも任意。
    - `chest`：数値、`cm`、30〜250、刻み 0.1、ラベル `measurement_item_chest`
    - `waist`：数値、`cm`、30〜250、刻み 0.1、ラベル `measurement_item_waist`
  - ラベルは ja/en の両方を持つ `LocalizedText` にする（`templates.ts` の `both()` と同じやり方）。
- **削除しない**：`markTypeDeleted`・`purgeType` は、標準の ID では何もしない。設定に「定義を削除」を出さない。
- **データの移行はしない**：Dexie の version 18 で `wellnessEntries`・`bodyRecords`・`selfCareRecords`・`girthRecords` を消す（`null` にする）。古いシートのタブ（`WellnessEntries`・`BodyMeasurements`・`SelfCare`・`Girth`）は、読みも書きも消しもしない。
- **新しい文言**：`custom_reset`（初期の定義に戻す / Reset to default）。`custom_reset_confirm`（`{name}の定義を初期の形に戻します。記録は消えません` / `Reset the {name} definition to its default. Records are kept.`）。`custom_reset_unfit_note`（`種類が合わない値は表示されなくなります（データは残ります）` / `Values that no longer fit their field will be hidden (the data is kept).`）。`custom_def_error_locked_field`（上の文言）。

## Review Focus

- **ストアを読み込む前の設定**：体調などの ON/OFF と並び順が消えない。レジストリが最初から標準の4つを持つので、`readModuleSettings` が `wellness` などを捨てない。→ Task 4 のテスト `keeps built-in ids before custom types load`。
- **新しい端末の初回の同期**：端末で入れた固定日時の定義が、シートにある作り変え済みの定義に負けて置き換わる。→ Task 2 のテスト `a customized remote definition beats the seeded one`。
- **以前のひな形のコピーの跡**：`RecordTypes:wellness` の tombstone や `deleted` の印があっても、体調は消えず、記録も消されない。→ Task 2 のテスト `ignores leftover tombstones and deleted flags for built-in ids`。
- **身体の変えられない項目**：`height` を消した定義の読み込みは `locked_field` で断る。表示名や範囲を変えた定義は通る。→ Task 1 のテスト。
- **おすすめ運動**：体調から `physical` を消した定義では、標準のおすすめ（スコア 3/3）になる。段階が 10 なら 1〜5 に換算する。→ Task 3 のテスト。

---

### Task 1: 標準の定義の一覧と、変えられない項目の検査

**Files:**
- Create: `src/features/modules/custom/builtin.ts`（`templates.ts` の中身を移して広げる）
- Delete: `src/features/modules/custom/templates.ts`、`templates.test.ts`（テストは `builtin.test.ts` に移す）
- Modify: `src/features/modules/custom/definition.ts`（`DefinitionErrorCode` に `"locked_field"` を足す）、`src/features/i18n/messages/ja.ts`・`en.ts`（`custom_def_error_locked_field`）、`src/features/modules/components/module-settings-section.tsx`（import 先を `builtin.ts` に変える。動きは Task 6 まで変えない）
- Test: `src/features/modules/custom/builtin.test.ts`

**Interfaces:**
- Produces：
  ```ts
  export const BUILTIN_IDS: readonly ["wellness", "body", "selfcare", "girth"];
  export type BuiltinId = (typeof BUILTIN_IDS)[number];
  export function isBuiltinId(id: string): id is BuiltinId;
  export function builtinDefinition(id: BuiltinId): CustomRecordDefinition;   // 同梱の定義（parseDefinition を通した形）
  export function builtinTags(id: BuiltinId): readonly ModuleTag[] | undefined; // selfcare → ["lymphedema"]
  export const BUILTIN_SEED_UPDATED_AT: string;          // "2000-01-01T00:00:00+00:00"
  export const KNOWN_SEED_UPDATED_ATS: readonly string[]; // [BUILTIN_SEED_UPDATED_AT]
  /** 身体の weight/height の決まりに反する点。標準でない ID や問題がなければ [] */
  export function lockedFieldErrors(definition: CustomRecordDefinition): DefinitionError[];
  /** 端末の定義が同梱の定義と同じか（JSON として深く比べる） */
  export function isDefaultDefinition(id: BuiltinId, definition: CustomRecordDefinition): boolean;
  ```
  `lockedFieldErrors` のエラーは `{ code: "locked_field", path: "fields.weight" }` の形（`height` も同じ）。

- [ ] **Step 1: 失敗するテストを書く**

  `builtin.test.ts`：
  - 4つの ID すべてで、`parseDefinition(JSON.parse(JSON.stringify(builtinDefinition(id))))` が `{ ok: true, definition: builtinDefinition(id) }` を返す（読み込み直しても形が変わらない）。
  - 身体の項目は `[["weight","number","kg"],["bodyFat","number","%"],["height","number","cm"]]`、胸囲・腹囲の項目は `[["chest","number","cm"],["waist","number","cm"]]`。名前は `{ ja: ja.module_body_label, en: en.module_body_label }`。
  - `builtinTags("selfcare")` は `["lymphedema"]`、`builtinTags("wellness")` は `undefined`。
  - `isBuiltinId("custom:wellness") === false`、`isBuiltinId("girth") === true`。
  - `lockedFieldErrors`：
    - 身体から `height` を消すと `[{ code: "locked_field", path: "fields.height" }]`。
    - `weight` の単位を `lb` にしても同じエラー（path は `fields.weight`）。
    - `weight` を `text` にしても同じエラー。
    - 体脂肪を消すだけ、または表示名や `max` を変えるだけなら `[]`。
    - 体調の定義なら、何を変えても `[]`。
  - `isDefaultDefinition("girth", builtinDefinition("girth")) === true`。`waist` の `max` を変えると `false`。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/builtin.test.ts`
  Expected: FAIL（モジュールがない）

- [ ] **Step 3: 実装する**

  Global Constraints の値で実装する。`module-settings-section.tsx` は、`builtInTemplate(id)` の代わりに `isBuiltinId(id) ? builtinDefinition(id) : undefined` を使う。

- [ ] **Step 4: テストが通ることを確かめる**

  Run: `npm test`
  Expected: すべて PASS

- [ ] **Step 5: コミットする**

---

### Task 2: 標準の定義を端末に入れ、作り変えを守り、削除させない

**Files:**
- Modify: `src/features/modules/custom/type-store.ts`、`src/features/sync/sync-engine.ts`（`RecordTypes` の tombstone から標準の ID を除く）
- Test: `src/features/modules/custom/type-store.test.ts`、`src/features/sync/sync-engine.test.ts`

**Interfaces:**
- Consumes：Task 1 の `isBuiltinId`・`builtinDefinition`・`BUILTIN_SEED_UPDATED_AT`・`KNOWN_SEED_UPDATED_ATS`・`lockedFieldErrors`・`isDefaultDefinition`。
- Produces：
  ```ts
  /** 標準の行がなければ固定日時で入れる。作り変えていない（updatedAt が KNOWN_SEED_UPDATED_ATS のどれか）古い版は、
   *  記録に合わない値がない限り最新の同梱の定義に置き換える。deleted は外す。RecordTypes:<標準の ID> の tombstone は消す。 */
  export function ensureBuiltinTypes(): Promise<void>;     // loadCustomTypes の先頭で呼ぶ
  export function isBuiltinCustomized(id: BuiltinId): boolean; // ストアの定義が同梱の定義と違うか
  /** 同梱の定義を updatedAt = 今で保存して同期する。 */
  export function resetBuiltin(id: BuiltinId): Promise<void>;
  /** 同梱の定義に戻すと表示されなくなる値をもつ記録の数（確認の文言用） */
  export function countRecordsUnfitForDefault(id: BuiltinId): Promise<number>;
  ```
  既存の関数の変更：
  - `planImport`：標準の ID で `lockedFieldErrors` があれば `{ ok: false, errors }` を返す。
  - `markTypeDeleted`・`purgeType`：標準の ID では何もしない。
  - `deleteOrphanRecords`：標準の ID の記録は消さない。
  - `applyRows`：標準の ID の行は `deleted: false` として出す。

- [ ] **Step 1: 失敗するテストを書く**

  `type-store.test.ts`（`scheduleSync` はモックする）：
  - `seeds missing built-in types with the fixed date`：空の端末で `loadCustomTypes()` すると、4つの行が `updatedAt === BUILTIN_SEED_UPDATED_AT`、`deleted === false` で入っている。
  - `keeps a customized built-in on load`：`wellness` に `appetite` 項目を足した定義を `saveImportedDefinition` したあとに `loadCustomTypes()` しても、`appetite` は残る。`isBuiltinCustomized("wellness") === true`。
  - `ignores leftover tombstones and deleted flags for built-in ids`：
    - `RecordTypes:wellness` の tombstone と、`deleted: true` の `wellness` 行を置いてから `loadCustomTypes()` する。
    - 行は `deleted: false` になり、tombstone は消えている。
    - `wellness` の記録は、`deleteOrphanRecords()` のあとも残る。
  - `refuses to delete built-ins`：`markTypeDeleted("body", true)` も `purgeType("body")` も、行と記録を変えない。
  - `rejects a body import that removes height`：`planImport` が `locked_field` を返す。表示名だけ変えた身体の定義は `kind: "update"` で通る。
  - `resets a built-in to its default`：`girth` に `hip` を足して保存し、記録を1件作る。`resetBuiltin("girth")` のあと、定義は `builtinDefinition("girth")` と同じで、`updatedAt` は固定日時ではない（今）。記録の `hip` の値は残る。
  - `counts records unfit for the default`：`wellness` の `physical` を消し、同じ ID を `text` で足した定義で、文字列の値を持つ記録を1件作る。`countRecordsUnfitForDefault("wellness") === 1`。

  `sync-engine.test.ts`：
  - `a customized remote definition beats the seeded one`：端末は空。シートの `RecordTypes` に、`appetite` を足した `wellness` の行がある（`updatedAt` は今）。同期のあと、端末の `wellness` の定義に `appetite` がある。
  - `RecordTypes tombstones for built-in ids are ignored`：シートの Tombstones に `RecordTypes:wellness` がある。同期のあとも、端末の `wellness` の行と記録が残っている。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/type-store.test.ts src/features/sync/sync-engine.test.ts`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

  - `ensureBuiltinTypes` は、`customRecordTypes`・`customRecords`・`tombstones` の rw トランザクション1つで行う。
  - `sync-engine.ts` では、`RecordTypes` を同期するときに渡す tombstone の Map から、標準の ID を除く。`syncTable` の中で足される端末の tombstone は、`ensureBuiltinTypes` が消しているので、そのままでよい。
  - `resetBuiltin` の `updatedAt` には、既存の `liveTypeUpdatedAt` を使う。

- [ ] **Step 4: テストが通ることを確かめる**

  Run: `npm test`
  Expected: すべて PASS

- [ ] **Step 5: コミットする**

---

### Task 3: おすすめ運動が新しい体調を読む

**Files:**
- Modify: `src/features/modules/wellness/condition.ts`（ここだけ残る。読み先を `customRecords` に変える）、`src/features/today/use-today-data.ts`（必要なら）
- Test: `src/features/modules/wellness/condition.test.ts`

**Interfaces:**
- Consumes：Task 2 の `getCustomTypes()`（`wellness` の定義）、Task 2 で入る `customRecords`（`typeId: "wellness"`）。
- Produces：`getLatestConditionScores(dayKey: string): Promise<ConditionScores | null>`。名前と戻り値の型は今のまま。

  決まり：
  - その日の `wellness` の記録のうち、最後のものを使う。
  - 体調の定義に `physical` と `mental` の `scale` 項目が両方あり、その記録に両方の値があるときだけ値を返す。それ以外は `null` を返す。
  - 段階 `L` が 5 でなければ、`Math.round(1 + (v - 1) * 4 / (L - 1))` で 1〜5 に換算する。

- [ ] **Step 1: 失敗するテストを書く**

  - 標準の定義で `{ physical: 4, mental: 2 }` の記録があれば、`{ physicalScore: 4, mentalScore: 2 }` を返す。
  - 同じ日に2件あれば、後の記録を使う。
  - `physical` を消した定義では `null` を返す（`use-today-data` は標準のおすすめ、つまり 3/3 になる）。
  - `levels: 10` で `{ physical: 10, mental: 1 }` なら `{ 5, 1 }` を返す。
  - `appetite` を足しただけの定義では、今までどおりスコアを返す。

- [ ] **Step 2: 失敗を確認する**

- [ ] **Step 3: 実装する**

- [ ] **Step 4: テストが通ることを確かめる**

  Run: `npm test`
  Expected: すべて PASS

- [ ] **Step 5: コミットする**

---

### Task 4: レジストリを切り替え、コードの4モジュールをなくす

**Files:**
- Modify: `src/features/modules/data-registry.ts`、`src/features/modules/registry.ts`、`src/features/modules/custom/data.ts`（`createCustomModuleData` に `moduleId` の指定を足す）、`src/features/modules/custom/module.tsx`（`createCustomModule` にオプションを足す）、`src/features/storage/app-db.ts`（version 18）、`src/lib/types.ts`（使わなくなった型を消す）、`src/features/measurements/measurement-items.ts`（`BODY_ITEMS`・`GIRTH_ITEMS` を、腕・脚周径が使う分を残して整理）
- Delete: `src/features/modules/wellness/`（Task 3 で書き換えた `condition.ts` だけ残す）、`body/`、`selfcare/`、`girth/` と、そのテスト
- Test: `src/features/modules/registry.test.ts`、`src/features/modules/module-settings.test.ts`

**Interfaces:**
- Consumes：Task 1 の `BUILTIN_IDS`・`builtinDefinition`・`builtinTags`・`BUILTIN_SEED_UPDATED_AT`。Task 2 の `getCustomTypes()`（標準の行は `deleted: false`）。
- Produces：
  ```ts
  // custom/data.ts
  export function createCustomModuleData(type: CustomRecordType, options?: { moduleId?: string }): RecordModuleData<CustomRecord>;
  // custom/module.tsx
  export type CustomModuleExtras = {
    graphMetrics?(data: RecordModuleData<CustomRecord>): GraphMetric[];
    FormExtra?: ComponentType<{ values: Record<string, CustomValue>; recordedAt: string; recordId?: string }>;
    SummaryExtra?: ComponentType<{ records: CustomRecord[] }>;
  };
  export function createCustomModule(
    type: CustomRecordType,
    data?: RecordModuleData<CustomRecord>,
    options?: { isCustom?: boolean; tags?: readonly ModuleTag[]; extras?: CustomModuleExtras },
  ): RecordModule<CustomRecord>;
  // data-registry.ts / registry.ts
  /** 標準の型：ストアにあればそれ、なければ同梱の定義と固定日時から作る */
  function builtinType(id: BuiltinId): CustomRecordType;
  ```
  - 標準のモジュールは `isCustom: false`、`hidden: false`、モジュール ID は定義 ID。
  - `extras` の中身は Task 5 で入れる。このタスクでは型と差し込み口だけ作る。
  - `recordModules()` と `recordModuleData()` は、並び（Global Constraints）を守る。標準のモジュールのオブジェクトは、カスタムと同じく `updatedAt` が変わらない限り使い回す。

- [ ] **Step 1: 失敗するテストを書く**

  - `registry.test.ts`：
    - `recordModules().map(m => m.data.id)` の先頭8つが、Global Constraints の並びになる（ストアが空でも）。
    - `getRecordModule("selfcare")?.tags` は `["lymphedema"]`。`getRecordModule("wellness")?.isCustom` は falsy。
    - 標準のモジュールの `data` は、`recordModuleData()` の同じ位置のものと同じオブジェクト。
  - `module-settings.test.ts`：`keeps built-in ids before custom types load`。保存値が `{ order: ["girth","wellness",...], disabled: ["girth"] }` で、ストアを読み込む前に `readModuleSettings(registryIds)` を呼んでも、`order` と `disabled` が変わらない。
  - `storage.test.ts`：version 18 で、古い4つのテーブルがなくなる。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules src/features/storage`
  Expected: 新しいテストが FAIL

- [ ] **Step 3: 実装する**

  - 消したモジュールを参照していた既存のテストは、消すか、標準の定義に合わせて直す。何を消し、何を直したかはレポートに書く。
  - `sync_tab_*` の i18n キーのテスト（`sync-tab-keys.test.ts`）が古いタブ名を求めていれば、それに合わせて整理する。

- [ ] **Step 4: 全テスト・型検査を通す**

  Run: `npm test` と `npx tsc --noEmit`
  Expected: すべて PASS。テストファイル以外に型のエラーがない。

- [ ] **Step 5: コミットする**

---

### Task 5: 身体の BMI

**Files:**
- Create: `src/features/modules/custom/builtin-body.tsx`（身体の `CustomModuleExtras`）
- Modify: `src/features/modules/registry.ts`（`body` に extras を渡す）、`src/features/modules/custom/custom-form.tsx`（`FormExtra` を描く）、`src/features/modules/custom/module.tsx`（`graphMetrics` と `SummaryExtra` を足す）
- Test: `src/features/modules/custom/builtin-body.test.tsx`

**Interfaces:**
- Consumes：Task 4 の `CustomModuleExtras` と `createCustomModule` のオプション。既存の `calculateBmi`（`src/features/metrics/bmi.ts`）、`bmi_value`・`bmi_need_height`・`history_graph_metric_bmi`。
- Produces：`export const bodyExtras: CustomModuleExtras;`

  BMI の決まり（今の身体と同じ）：
  - その記録の `height` があればそれを使う。なければ、その記録の日時以前で最新の `height` を使う。
  - グラフの点は、`weight` を持つ記録ごとに1つ。単位は `""`、小数1桁。
  - 期間のまとめは、期間内の最後の `weight` と、その時点の身長から求めた BMI を1行で出す。

- [ ] **Step 1: 失敗するテストを書く**

  - フォームで体重 60、身長 170 を入れると、`BMI 20.8` が見える。
  - 身長が空でも、前の記録に身長 170 があれば `BMI 20.8` が見える。
  - 身長が1つもなければ、`身長を記録するとBMIが出ます` が見える。
  - 身体の履歴のグラフの選択肢に `BMI` がある。2件の記録（170cm/60kg、その後 65kg だけ）で、BMI の点は `[20.8, 22.5]` になる。
  - 期間のまとめに `BMI 22.5` が出る。

- [ ] **Step 2: 失敗を確認する**

  Run: `npx vitest run src/features/modules/custom/builtin-body.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 実装する**

- [ ] **Step 4: テストが通ることを確かめる**

  Run: `npm test`
  Expected: すべて PASS

- [ ] **Step 5: コミットする**

---

### Task 6: 設定の「⋯」（書き出す・初期の定義に戻す）

**Files:**
- Modify: `src/features/modules/components/module-settings-section.tsx`、`src/features/i18n/messages/ja.ts`・`en.ts`
- Test: `src/features/modules/components/module-settings-section.test.tsx`

**Interfaces:**
- Consumes：Task 2 の `isBuiltinCustomized`・`resetBuiltin`・`countRecordsUnfitForDefault`、Task 1 の `isBuiltinId`。

  画面の決まり：
  - 標準の行には「カスタム」の印を出さない。
  - 「⋯」には「定義を書き出す」を出す。書き出すのはストアにある今の定義で、ファイル名は `exerlog-<id>.json`。
  - 作り変えているときだけ「初期の定義に戻す」を出す。
  - 「定義を削除」は出さない。
  - 「初期の定義に戻す」を押すと、行の中に確認が出る（今の削除の確認と同じ形）。
    - 文言は `custom_reset_confirm`。合わない記録が1件以上あれば、`custom_reset_unfit_note` も出す。
    - 確定すると `resetBuiltin` を呼ぶ。失敗したら `custom_save_failed` を出す。

- [ ] **Step 1: 失敗するテストを書く**

  - 体調の行に「カスタム」の印がない。
  - 「⋯」には「定義を書き出す」があり、「定義を削除」と「初期の定義に戻す」はない（作り変えていない状態）。
  - `wellness` に `appetite` を足して保存すると、「初期の定義に戻す」が出る。押して確定すると、定義が同梱の形に戻る。
  - 合わない記録があるときは、確認に `種類が合わない値は表示されなくなります（データは残ります）` が出る。

- [ ] **Step 2: 失敗を確認する**

- [ ] **Step 3: 実装する**

- [ ] **Step 4: テストが通ることを確かめる**

  Run: `npm test`
  Expected: すべて PASS

- [ ] **Step 5: コミットする**

---

### Task 7: AI に渡す説明・ドキュメント・README

**Files:**
- Modify: `src/features/modules/custom/ai-guide.ts`、`docs/custom-record-definitions.md`、`README.md`
- Test: `src/features/modules/custom/ai-guide.test.ts`

決まり：
- **AI に渡す説明（日英）**：次の文を足す。
  - ja：「`wellness`（体調）・`body`（身体）・`selfcare`（セルフケア）・`girth`（胸囲・腹囲）の ID で読み込むと、標準の項目そのものが変わります。身体の `weight` と `height` は、消したり種類・単位を変えたりできません」
  - en は同じ内容。
- **`docs/custom-record-definitions.md`**：日本語の説明と同じ内容に直す。
- **README（英語・日本語の両方）**
  - 「身体測定項目を追加する」の節は、腕・脚周径以外の測定項目は定義の読み込みで足せることに書き換える。
  - 機能の一覧とカスタム記録の節に、「体調・身体・セルフケア・胸囲・腹囲は、書き出して作り変え、同じ ID で読み込むとその場で変わる。削除はできず、初期の定義に戻せる」ことを書く。

- [ ] **Step 1: 失敗するテストを書く**

  `buildAiGuide("ja")` と `buildAiGuide("en")` の両方が、`wellness`・`body`・`selfcare`・`girth`・`weight`・`height` を含む。

- [ ] **Step 2: 失敗を確認し、実装し、通す**

  Run: `npm test`、`npm run lint`、`npm run build`
  Expected: すべて成功

- [ ] **Step 3: コミットする**
