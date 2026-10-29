# 胸囲・腹囲モジュール 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「身体」と同じ作りの記録モジュール「胸囲・腹囲」（id `girth`）を足す。

**Architecture:** 計測系の既存部品（`MeasurementRecord`、`createMeasurementRepository`、`createMeasurementModuleData`、`useMeasurementForm`、`MeasurementTimelineCard`、`MetricGraphView`）を再利用し、`src/features/modules/girth/` に body と同じファイル構成で置く。Task 1 はデータ層（項目、テーブル、リポジトリ、モジュールのデータ定義）、Task 2 は画面と、データ・画面の両レジストリへの登録。

**Tech Stack:** Next.js 15、React 19、TypeScript、Dexie 4、Vitest + Testing Library（jsdom）。

**Spec:** `docs/superpowers/specs/2026-10-29-girth-module-design.md`

## Global Constraints

- モジュール id は `girth`、Dexie テーブルは `girthRecords`（索引 `"id, date, recordedAt"`）、同期のタブ名は `Girth`、CSV は `girth.csv`。
- 項目は `chest` と `waist` の2つ。どちらも単位 `cm`、`decimals: 1`、`min: 30`、`max: 250`、`showInGraph: true`。
- 文言:
  - `module_girth_label`：ja「胸囲・腹囲」/ en "Chest & waist"
  - `module_girth_description`：ja「胸囲・腹囲の推移」/ en "Chest and waist over time"
  - `girth_edit_title`：ja「胸囲・腹囲の記録を編集」/ en "Edit chest & waist record"
  - `measurement_item_chest`：ja「胸囲」/ en "Chest"
  - `measurement_item_waist`：ja「腹囲（へその高さ）」/ en "Waist (at navel)"
  - `settings_export_girth`：ja「胸囲・腹囲」/ en "Chest & waist"
  - `sync_tab_Girth`：ja「胸囲・腹囲」/ en "Chest & waist"
- 並び順は `body` の直後。`recordModuleData()` と `RECORD_MODULES` の両方で `wellness, body, girth, circumference, photo, selfcare, compression, symptoms`。
- タグは付けない（`tags` なし）。
- Dexie はバージョン 14 を足し、v13 と同じ全テーブルに `girthRecords` を加えて並べる。既存のテーブルは変えない。
- `npx tsc --noEmit` は main の時点で約144件のエラーがある。触ったファイルに新しいエラーを出さないこと。`tsconfig.tsbuildinfo` が変わったら `git checkout -- tsconfig.tsbuildinfo` で戻し、コミットしない。

## Review Focus

1. **既存の端末**（設定を保存済み）で、胸囲・腹囲が一覧の末尾に ON で加わり、ほかの ON/OFF と並び順が変わらないこと。→ Task 2 のテスト `appends girth enabled for a device with saved settings`
2. **片方だけ入力した記録**（胸囲だけ、腹囲だけ）が、保存、タイムライン、グラフ、まとめで落ちずに扱えること。→ Task 2 のテスト `summarizes when only one item was recorded`
3. **全消去と同期**が `girthRecords` を含むこと（記録が残ったり、削除の記録（tombstone）が抜けたりしない）。→ Task 1 の `girth/data.test.ts` と、Task 2 の data-registry テストの拡張
4. **範囲外の値**（29.9、250.1）や小数2桁は、フォームで保存できないこと。→ 既存の `useMeasurementForm` の検証を使う。Task 2 のフォームのテスト `rejects out-of-range values`
5. **英語表示**で、モジュール名と項目名が日本語のまま出ないこと。→ Task 2 のテスト `renders English labels`

---

### Task 1: データ層（項目・テーブル・同期・CSV）

**Files:**
- Modify: `src/features/measurements/measurement-items.ts`（`GIRTH_ITEMS` を足し、`getMeasurementItem` が探す対象にも含める）
- Modify: `src/features/storage/app-db.ts`（`girthRecords` の宣言と `version(14)`）
- Create: `src/features/modules/girth/data.ts`
- Modify: `src/features/i18n/messages/ja.ts`、`en.ts`（`measurement_item_chest`、`measurement_item_waist`、`settings_export_girth`、`sync_tab_Girth`）
- Test: `src/features/modules/girth/data.test.ts`（新規）。Dexie のテーブル一覧をそのまま比較しているテスト（`storage.test.ts` など）があれば直す。

**Interfaces:**
- Produces:
  - `export const GIRTH_ITEMS: readonly MeasurementItem[]`（`chest`、`waist` の順）
  - `appDb.girthRecords: Table<MeasurementRecord, string>`
  - `export const girthRepository = createMeasurementRepository(appDb.girthRecords, "Girth")`
  - `export const girthData = createMeasurementModuleData({ id: "girth", repository: girthRepository, items: GIRTH_ITEMS, csv: { fileName: "girth.csv", exportLabelKey: "settings_export_girth" } })`

- [ ] **Step 1: 失敗するテストを書く**
  - `girth/data.test.ts` を新しく作る。次の4つを確かめる。
    - `girthRepository` で `{ chest: 92.5 }` だけの記録を保存すると、`girthData.listForDay` で取れる。
    - `girthData.csv.generate()` のヘッダーに `chest` と `waist` の列がある。
    - `girthData.clearAll()` のあとは `count()` が 0 で、`Girth` の tombstone が残っている。
    - `girthData.syncConfigs` のタブ名が `["Girth"]` である。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules/girth/data.test.ts`
Expected: FAIL（`./data` がない）

- [ ] **Step 3: 実装する**

`GIRTH_ITEMS` は `BODY_ITEMS` と同じ形で書く（値は Global Constraints のとおり）。`getMeasurementItem` は BODY → GIRTH → CIRCUMFERENCE の順に探す。`MEASUREMENT_ITEMS` は変えない（周径の古い呼び出し元用なので）。Dexie の v14 は v13 の stores をそのまま写し、`girthRecords` を足す。コメントは `// v14: chest & waist girth records.` とする。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run src/features/modules src/features/storage src/features/sync src/features/measurements`
Expected: PASS（まだどのレジストリにも登録しないので、既存のテストは変わらない）

- [ ] **Step 5: コミット**

```bash
git add src/features/measurements/measurement-items.ts src/features/storage/app-db.ts src/features/modules/girth src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "feat(girth): chest & waist data layer, Dexie v14, sync tab and CSV"
```
（ほかに直したテストファイルもあれば加える）

---

### Task 2: 画面と登録

**Files:**
- Create: `src/features/modules/girth/girth-form.tsx`、`graph.ts`、`summary.ts`、`summary-card.tsx`、`module.tsx`
- Modify: `src/features/modules/body/summary.ts`（`firstLast` を export して共有する）
- Modify: `src/features/modules/data-registry.ts`（`bodyData` の直後に `girthData`）
- Modify: `src/features/modules/registry.ts`（`bodyModule` の直後に `girthModule`）
- Modify: `src/features/i18n/messages/ja.ts`、`en.ts`（`module_girth_label`、`module_girth_description`、`girth_edit_title`）
- Test: `src/features/modules/girth/summary.test.ts`、`girth-form.test.tsx`、`module.test.tsx`（すべて新規）、`src/features/modules/data-registry.test.ts`、`src/features/modules/registry.test.ts`、`module-settings-section.test.tsx`、ほかのモジュール一覧を比較しているテスト（`history-screen.test.tsx`、`period-summary-dialog.test.tsx`、`timeline-section.test.tsx`、`today-screen.test.tsx`、`module-record-dialog.test.tsx` など。`npm test` で落ちたものを直す）

**Interfaces:**
- Consumes: Task 1 の `GIRTH_ITEMS`、`girthRepository`、`girthData`
- Produces:
  - `export function firstLast(sorted: MeasurementRecord[], itemId: string): FirstLast | null`（`body/summary.ts` から export する）
  - `export function summarizeGirth(records: MeasurementRecord[]): { count: number; chest: FirstLast | null; waist: FirstLast | null } | null`
  - `export const GIRTH_GRAPH_METRICS: readonly GraphMetric[]`
  - `export const girthModule: RecordModule<MeasurementRecord>`

- [ ] **Step 1: 失敗するテストを書く**
  - `girth/summary.test.ts`:
    - `returns null for no records`：空配列なら `null`。
    - `summarizes first/last/min/max per item`：記録を時刻の逆順で渡す。胸囲が 90.0 → 92.0 → 91.0 なら、`{ first: 90, last: 91, diff: 1, min: 90, max: 92 }`。
    - `summarizes when only one item was recorded`：腹囲だけの記録なら、`chest` が `null` で、`waist` に値が入る。
  - `girth/girth-form.test.tsx`（body のフォームのテストがあればその形に合わせる。なければ `module-record-dialog.test.tsx` の描き方を使う）:
    - `saves chest and waist`：92.5 と 80.1 を入れて保存すると、`girthRepository` に `{ chest: 92.5, waist: 80.1 }` が入る。
    - `rejects out-of-range values`：胸囲に 29.9 や 250.1 を入れると保存できない。
  - `girth/module.test.tsx`:
    - `renders English labels`：英語で設定のモジュール一覧を描くと "Chest & waist" が出て、「胸囲」が出ない。
  - `data-registry.test.ts`：id 一覧の期待値を `["wellness", "body", "girth", "circumference", "photo", "selfcare", "compression", "symptoms"]` にする。タブ一覧と `sheetTabs()` の順の期待値は、`"BodyMeasurements"` の直後に `"Girth"` を入れる。`beforeEach` で `appDb.girthRecords.clear()` を呼ぶ。
  - `registry.test.ts`:
    - 並びが `recordModuleData()` と同じこと（既存のテスト）。
    - `girthModule` に `tags` がないこと。
  - `module-settings.test.ts` または `module-settings-section.test.tsx`:
    - `appends girth enabled for a device with saved settings`：girth を含まない `{ order: [7つの既存 id], disabled: ["photo"] }` を保存しておいて描くと、girth が末尾に ON で加わり、photo は OFF のまま。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules`
Expected: FAIL（`./girth/module` などがない）

- [ ] **Step 3: 実装する**
  - フォーム：`BodyForm` から BMI の部分を除いたもの。時刻、`GIRTH_ITEMS` の入力欄、メモ、フッター。
  - グラフ：`GIRTH_ITEMS.filter(showInGraph).map(itemMetric)`。`itemMetric` は body の graph.ts と同じ形で、`girthRepository` を使う。body と重複するので、`itemMetric(repository, item)` として body/graph.ts から export し、共有してよい。
  - まとめのカード：`BodySummaryCard` の `MetricLines` と同じ表示で、胸囲と腹囲を出す。
  - module.tsx：アイコンは lucide の `Shrink`（なければ `Ruler` 以外で、意味の近いもの）。色は既存と被らない `#8a6d1f` にする。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test`
Expected: すべて PASS。モジュールの一覧を比較している既存のテストは、`身体` の直後に `胸囲・腹囲` が入る形に期待値を直す。データ層やほかのモジュールの動きが変わってテストが落ちた場合は、期待値を直さずに原因を調べる。

- [ ] **Step 5: コミット**

```bash
git add -A src
git commit -m "feat(girth): chest & waist form, timeline, history graph, summary; register module"
```

## 最後の確認

- [ ] `npm test`、`npm run lint`、`npm run build` が通る。触ったファイルに新しい `tsc` のエラーがない。
- [ ] 設定の一覧で「身体」の直後に「胸囲・腹囲」があり、タグなしで ON になっている。
