# 記録モジュールの土台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記録の種類を独立した「記録モジュール」（体調・身体・周径）に分ける。そのうえで、「＋記録する」のシート、履歴のチップ、設定での ON/OFF と並べ替え、期間のまとめを、モジュールの一覧（レジストリ）から組み立てる。

**Architecture:**
- **モジュールの契約は2層に分ける。**
  - データ層 `RecordModuleData`：React を含まない。保存、同期、CSV、カレンダーの印、期間での取得を持つ。
  - 画面層 `RecordModule`：`data` を含み、フォーム、タイムラインのカード、履歴の見返し画面、まとめのカードを持つ。
  - 同期やデータ管理はデータ層のレジストリ `recordModuleData()` だけを見る。画面はレジストリ `RECORD_MODULES` と設定（`useModuleSettings`）だけを見る。
- **身体と周径の分け方。**
  - 記録の形は今の `MeasurementRecord`（`values` の連想配列）のまま、テーブルとシートのタブを分ける。
  - 共通部分（項目の定義、リポジトリ、同期設定、入力欄）は、モジュールではない共有ライブラリ `src/features/measurements/` に置く。
  - 古い `measurements` のデータは移行せずに捨てる。
- **運動・視聴はモジュールにしない。** タイムラインと期間のまとめで、土台側が直接並べる。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4、Recharts、Radix Dialog、Vitest + fake-indexeddb + Testing Library。新しく `@dnd-kit/core`・`@dnd-kit/sortable`・`@dnd-kit/utilities` を入れる（Task 7 のみ）。

**Spec:** `docs/superpowers/specs/2026-10-27-record-modules-foundation-design.md`

## Global Constraints

- **画面の文言**：`src/features/i18n/messages/{ja,en}.ts` を通す。ja と en の両方に追加し、使わなくなったキーは両方から消す。
- **依存パッケージ**：追加してよいのは Task 7 の `@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0`、`@dnd-kit/utilities@3.2.2` だけ。
- **モジュールの id**：`wellness`、`body`、`circumference`。設定の保存に使うので変えない。
- **初期の並び順**：体調、身体、周径。
- **シートのタブ名**：
  - 身体は `BodyMeasurements`、周径は `Circumference`。tombstone の `table` にも同じ名前を使う。
  - 古い `Measurements` タブは読みも書きもしない。消しもしない。
- **Dexie**：
  - v11 で、`measurements: null`、`bodyRecords: "id, date, recordedAt"`、`circumferenceRecords: "id, date, recordedAt"` にする。
  - 古いデータは移行しない。消すのは身体・周径だけで、ほかのテーブルには手を付けない。
- **日時**：すべての記録は `recordedAt`（ローカル時刻＋オフセットの ISO 文字列）を持つ。
  - リポジトリの追加処理は、`recordedAt` を欠いた入力を受け付けない（今と同じく、省略時は `localIsoAt(date)` で補う）。
  - 日時を比べるときは、文字列の比較ではなく `Date.parse` を使う。
- **モジュールの設定**：
  - localStorage のキーは `lymly-record-modules`、形は `{ "order": string[], "disabled": string[] }`。
  - 読み書きの失敗は無視し、初期値（すべて ON、初期の並び順）で動く。
- **OFF のモジュール**：記録は消さず、同期・CSV 書き出し・「すべての記録を削除」の対象には残す。画面（シート、タイムライン、履歴のチップ、カレンダーの印、期間のまとめ）からだけ消す。
- **モジュールのフォルダ**：`src/features/modules/<id>/` は、ほかのモジュールのフォルダを import しない。
  - 共有してよいもの：`src/features/modules/` 直下（土台）、`src/features/measurements/`、`src/features/storage/`、`src/features/sync/`、`src/features/history/` の部品、`src/lib/`、`src/components/`。
- **合格の条件**：
  - `npx tsc --noEmit` でエラーがない。
  - `npm test` がすべて通る（開始時に一度実行し、既に失敗しているテストがあれば記録しておく）。

## Review Focus

1. **設定に知らない id や重複が入っている**（古い版や手で書き換えた localStorage）：知らない id は捨て、重複は最初の1つにする。レジストリにあって設定にない id は、ON のまま末尾に足す。→ Task 1 のテスト。
2. **表示中のモジュールを OFF にした**：履歴でそのチップを選んでいた場合は「すべて」に戻る。タイムラインからは、そのモジュールの記録が消える。→ Task 5・Task 6 のテスト。
3. **期間の開始が終了より後**：まとめのカードは出さず、「開始は終了より前にしてください」と表示する。→ Task 9 のテスト。
4. **期間の境目**：開始・終了ちょうどの記録は含む。開始日の0時より前の記録は含まない。日付キーで粗く絞ってから `Date.parse` で絞る。→ Task 4 のテスト。
5. **身長がない／期間外にしかない**：身体のまとめの BMI は、期間内の最後の体重と、その時点以前で一番新しい身長（期間より前でもよい）から計算する。身長がなければ BMI の行を出さない。→ Task 9 のテスト。

---

## ファイル構成（完成時）

```
src/features/modules/
  types.ts                 RecordModuleData / RecordModule / Period など契約の型
  data-registry.ts         recordModuleData()（React なし）
  registry.ts              RECORD_MODULES（画面層）
  module-settings.ts       設定の解決・読み書き・useModuleSettings
  period.ts                期間の型と日付キー変換・絞り込み
  components/
    add-record-sheet.tsx   「＋記録する」の下から出るシート
    module-record-dialog.tsx  モジュールのフォームを包むダイアログ
    module-settings-section.tsx  設定画面の「記録する項目」
  wellness/  data.ts  condition.ts  module.tsx  summary.ts  (+ 既存フォームを移動)
  body/      data.ts  module.tsx  summary.ts  body-form.tsx  graph.ts
  circumference/ data.ts  module.tsx  summary.ts  circumference-form.tsx (+ 既存の周径部品を移動)
src/features/measurements/
  measurement-items.ts     BODY_ITEMS / CIRCUMFERENCE_ITEMS に分割
  measurement-repository.ts  createMeasurementRepository
  measurement-sync.ts      createMeasurementSyncConfig
  components/measurement-input.tsx  入力欄・下書きの解析（今の measurement-form から抜き出す）
src/features/sync/sync-helpers.ts   cell / replaceTable など（sync-config から移動）
src/features/history/
  range-presets.tsx        7日・30日・90日・全部
  components/metric-graph-view.tsx  項目を選んで1本の線を描く汎用部品
  components/history-module-tabs.tsx  チップと見返し画面の切り替え
src/features/period-summary/
  exercise-summary.ts  components/period-summary-dialog.tsx
```

削除するもの：
- `src/features/storage/measurements.repository.ts`（とテスト）
- `src/features/timeline/components/record-dialog.tsx`、`measurement-form.tsx`
- `src/features/history/history-graph-query.ts`、`components/history-graphs.tsx`（とテスト）
- 中身は各モジュールへ移す。

---

### Task 1: モジュール設定の解決と保存

**Files:**
- Create: `src/features/modules/module-settings.ts`
- Test: `src/features/modules/module-settings.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MODULE_SETTINGS_STORAGE_KEY = "lymly-record-modules";
  export type ModuleSettings = { order: string[]; disabled: string[] };
  /** stored: JSON.parse した値（何でもよい）。registryIds: レジストリの順の id。 */
  export function resolveModuleSettings(stored: unknown, registryIds: readonly string[]): ModuleSettings;
  export function readModuleSettings(registryIds: readonly string[]): ModuleSettings;
  export function writeModuleSettings(settings: ModuleSettings): void;
  export function setModuleEnabled(s: ModuleSettings, id: string, enabled: boolean): ModuleSettings;
  export function moveModule(s: ModuleSettings, id: string, toIndex: number): ModuleSettings;
  /** 同じタブ内の全購読者に変更を知らせる（useSyncExternalStore 用）。 */
  export function subscribeModuleSettings(listener: () => void): () => void;
  ```
  - `useModuleSettings` は Task 5 で、レジストリができてからこのファイルに足す。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  const IDS = ["wellness", "body", "circumference"];
  it("returns registry order, all enabled, for missing or broken data", () => {
    for (const stored of [null, undefined, "x", 3, { order: "x" }]) {
      expect(resolveModuleSettings(stored, IDS)).toEqual({ order: IDS, disabled: [] });
    }
  });
  it("drops unknown ids, dedupes, appends new registry ids enabled at the end", () => {
    expect(resolveModuleSettings({ order: ["body", "ghost", "body", "wellness"], disabled: ["ghost", "body"] }, IDS))
      .toEqual({ order: ["body", "wellness", "circumference"], disabled: ["body"] });
  });
  it("moveModule clamps the index and setModuleEnabled toggles", () => {
    const s = { order: IDS, disabled: [] };
    expect(moveModule(s, "circumference", 0).order).toEqual(["circumference", "wellness", "body"]);
    expect(moveModule(s, "wellness", 99).order).toEqual(["body", "circumference", "wellness"]);
    expect(setModuleEnabled(s, "body", false).disabled).toEqual(["body"]);
    expect(setModuleEnabled({ order: IDS, disabled: ["body"] }, "body", true).disabled).toEqual([]);
  });
  it("read falls back when localStorage throws; write+read round-trips", () => { /* vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error() }) */ });
  it("writeModuleSettings notifies subscribers", () => { /* listener が1回呼ばれる */ });
  ```
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/modules/module-settings.test.ts` / Expected: FAIL（モジュールがない）
- [ ] **Step 3: 実装する**
  - 純粋関数は新しいオブジェクトを返す。
  - 書き込みでは、`try/catch` で保存したあとに購読者へ知らせる。保存に失敗しても知らせる（そのタブの中では反映させるため）。
  - 読み込みでは、同じ文字列なら同じオブジェクトを返すよう、直前の結果をキャッシュする（`useSyncExternalStore` の `getSnapshot` 対策）。
- [ ] **Step 4: 成功を確認** — 同じコマンドで PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(modules): resolve and persist record module settings"`

---

### Task 2: 同期のタブ一覧を設定から組み立てる（振る舞いは変えない）

**Files:**
- Create: `src/features/sync/sync-helpers.ts`（`cell`、`nullableNumber`、`replaceTable`、`keepLatestPerKey` を `sync-config.ts` から移す）
- Modify: `src/features/sync/google-sheets.ts`、`sync-config.ts`、`sync-engine.ts`、`SyncProvider.tsx`、`src/features/i18n/messages/index.ts`
- Test: 既存の `google-sheets.test.ts`、`sync-engine.test.ts`、`SyncProvider.test.tsx` を合わせて直す

**Interfaces:**
- Produces:
  - `TableSyncConfig.tabName: string`（`SheetTab` 型は削除）。
  - `sync-config.ts`：定数 `TABLE_SYNC_CONFIGS` を関数 `export function tableSyncConfigs(): TableSyncConfig[]` に変え、`export function sheetTabs(): string[]`（`tableSyncConfigs().map((c) => c.tabName)`）を足す。
    - 関数にするのは、Task 4 で生じる循環 import（モジュールの `data.ts` → `auto-sync` → `sync-engine` → `sync-config` → `data-registry` → `data.ts`）で、読み込み時に未初期化の値を参照しないようにするため。
    - 呼び出し側（`sync-engine.ts`、テスト）はすべて関数の呼び出しに直す。
  - `google-sheets.ts`：
    - `createSpreadsheet(accessToken: string, tabs: readonly string[])`
    - `ensureSheetTabs(accessToken: string, spreadsheetId: string, tabs: readonly string[])`
    - google-sheets から `SHEET_TABS` を消す。
  - `SyncProvider` の判定に使う一覧も `sheetTabs()` にする。
  - `i18n/messages/index.ts`：`export function isMessageKey(key: string): key is keyof Messages`
  - `SyncProvider` の `tabLabel` は `isMessageKey(\`sync_tab_${tableName}\`)` で判定する。

- [ ] **Step 1: テストを直す**
  - `google-sheets.test.ts`：`createSpreadsheet` / `ensureSheetTabs` に渡したタブ一覧どおりに `addSheet` が送られることを確かめる。
    - 例：`["A","B"]` を渡し、既存が `A` だけなら、`addSheet` は `B` だけ。
  - `SyncProvider.test.tsx`：知らないタブ名（`"Unknown"`）は生の名前で、`"WellnessEntries"` は「体調記録」で表示されることを確かめる。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/sync` / Expected: FAIL（引数の数・関数がない）
- [ ] **Step 3: 実装する**
  - `sync-engine.ts` は `sheetTabs()` を `createSpreadsheet` / `ensureSheetTabs` に渡す。
  - `tableSyncConfigs()` の並びは今と同じにする（Tombstones は最後）。
- [ ] **Step 4: 成功を確認** — Run: `npx vitest run src/features/sync && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "refactor(sync): derive sheet tabs from table sync configs"`

---

### Task 3: 身体と周径を別々に保存・同期・入力する

この Task の終わりで、アプリは「体調｜身体｜周径」の3つのタブがある今の記録画面で動く。タブは一時的なもので、Task 5 でシートに置き換える。

**Files:**
- Modify: `src/features/measurements/measurement-items.ts`
  - `BODY_ITEMS`、`CIRCUMFERENCE_ITEMS` を export する。
  - `MEASUREMENT_ITEMS` は残してよいが、新しいコードでは使わない。
  - `formatMeasurementSummary(record, items, t)` に `items` 引数を足す。
- Create: `src/features/measurements/measurement-repository.ts`、`measurement-sync.ts`、`components/measurement-input.tsx`
- Create: `src/features/modules/body/body-form.tsx`、`src/features/modules/circumference/circumference-form.tsx`
- Move（git mv）：
  - `src/features/timeline/components/{circumference-fields,circumference-help-dialog,limb-outlines}.*` → `src/features/modules/circumference/`
  - `src/features/history/components/circumference-graph.*` → `src/features/modules/circumference/`
- Modify:
  - `src/features/storage/app-db.ts`（v11）、`src/lib/types.ts`（変更なし。`MeasurementRecord` を両テーブルで使う）
  - `sync-config.ts`（`measurementsConfig` を `BodyMeasurements` と `Circumference` の2つに置き換え）
  - `clear-all-records.ts`、`settings/csv/history-csv.ts`、`settings/components/data-management.tsx`
  - `timeline/build-timeline.ts`、`use-day-timeline.ts`、`day-timeline.tsx`、`timeline-section.tsx`、`record-dialog.tsx`
  - `history/history-graph-query.ts`、`history/history-query.ts`
  - ja/en のメッセージ
- Delete: `src/features/storage/measurements.repository.ts`、`.test.ts`、`src/features/timeline/components/measurement-form.tsx`
- Test：
  - `src/features/measurements/measurement-repository.test.ts`（旧 `measurements.repository.test.ts` を移して直す）
  - `src/features/measurements/measurement-sync.test.ts`
  - `src/features/storage/storage.test.ts`（v11）
  - `record-dialog.test.tsx`、`timeline-section.test.tsx`、`history-graph-query.test.ts`、`sync-engine.test.ts` を合わせて直す

**Interfaces:**
- Produces:
  ```ts
  // measurement-repository.ts
  export type AddMeasurementInput = { date: string; values: Record<string, number>; note: string; recordedAt?: string };
  export type MeasurementRepository = {
    add(input: AddMeasurementInput): Promise<MeasurementRecord>;   // 空の values は throw（今と同じ）
    update(record: MeasurementRecord): Promise<void>;
    remove(id: string): Promise<void>;                               // tombstone は tombstoneTable 名で
    listForDay(date: string): Promise<MeasurementRecord[]>;         // 古い順
    listInDayRange(start: string, end: string): Promise<MeasurementRecord[]>; // 日付キー両端含む、古い順
    findPreviousValues(at: string, options?: { excludeId?: string }): Promise<Record<string, number>>;
    findLatestValueAt(itemId: string, at: string, options?: { excludeId?: string }): Promise<number | null>;
    table: Table<MeasurementRecord, string>;
    tombstoneTable: string;
  };
  export function createMeasurementRepository(table: Table<MeasurementRecord, string>, tombstoneTable: string): MeasurementRepository;
  // modules/body/data.ts と modules/circumference/data.ts（Task 4 で中身が増える）
  export const bodyRepository: MeasurementRepository;          // appDb.bodyRecords, "BodyMeasurements"
  export const circumferenceRepository: MeasurementRepository; // appDb.circumferenceRecords, "Circumference"
  // measurement-sync.ts
  export function createMeasurementSyncConfig(input: { tabName: string; items: readonly MeasurementItem[]; repository: MeasurementRepository }): TableSyncConfig;
  // measurement-input.tsx（今の measurement-form.tsx から抜き出す）
  export type Draft = { raw: string; badInput: boolean };
  export type ParsedValue = { state: "empty" } | { state: "invalid" } | { state: "ok"; value: number };
  export function parseDraft(item: MeasurementItem, draft: Draft | undefined, stored: number | undefined): ParsedValue;
  /** items の下書きから保存する values を組む。invalid があれば null。items 以外の値は record から引き継ぐ。 */
  export function buildValues(items: readonly MeasurementItem[], drafts: Record<string, Draft>, record?: MeasurementRecord): Record<string, number> | null;
  export function MeasurementInput(props: ...): JSX.Element;   // 今の実装のまま
  export function MeasurementField(props: ...): JSX.Element;   // 今の実装のまま
  // フォーム（両方とも同じ props の形）
  export type MeasurementFormProps = { onOpenChange(open: boolean): void; date: string; record?: MeasurementRecord; onSaved(record: MeasurementRecord): void; onDeleted?(): void };
  export function BodyForm(props: MeasurementFormProps): JSX.Element;          // 時刻、BODY_ITEMS、BMI、メモ
  export function CircumferenceForm(props: MeasurementFormProps): JSX.Element; // 時刻、腕｜脚、周径の格子、ヘルプ、メモ
  ```
- `TimelineItem` の `"measurement"` を `"body"`・`"circumference"` の2種類に分ける（`record: MeasurementRecord`）。点の色は次のとおり。
  - body：`#7a4fb0`（今の measurement の色）
  - circumference：`#c25b8c`
- `RecordKind = "wellness" | "body" | "circumference"`。localStorage の保存値が知らない値なら `wellness` で開く。
- i18n：
  - 足すキー（ja）：
    - `record_kind_body: "身体"`、`record_kind_circumference: "周径"`
    - `body_edit_title: "身体の記録を修正"`、`circumference_edit_title: "周径の記録を修正"`
    - `sync_tab_BodyMeasurements: "身体"`、`sync_tab_Circumference: "周径"`
    - `settings_export_body: "身体をエクスポート（CSV）"`、`settings_export_circumference: "周径をエクスポート（CSV）"`
    - `history_graph_metric_circumference` は残す。
  - 消すキー：`record_kind_measurement`、`measurement_edit_title`、`sync_tab_Measurements`、`settings_export_measurements`。
  - en も同様に足し・消す。

- [ ] **Step 1: 失敗するテストを書く**
  - `storage.test.ts`：
    - v10 の DB（`measurements` に1件、`wellnessEntries` に1件）を作ってから `AppDb` を開く。
    - `bodyRecords` と `circumferenceRecords` は空、`wellnessEntries` は1件のまま、`measurements` テーブルは存在しない。
  - `measurement-repository.test.ts`：
    - 旧テスト（前回の値、身長の探索、excludeId、空の values は throw、削除で tombstone）を `createMeasurementRepository(appDb.bodyRecords, "BodyMeasurements")` に対して実行する。
    - 削除の tombstone の id が `"BodyMeasurements:<id>"` になることを確かめる。
    - `findLatestValueAt("height", at)` が `at` 以前で一番新しい身長を返すことを確かめる。
  - `measurement-sync.test.ts`：
    - 身体の設定のヘッダーは `["id","date","recordedAt","note","updatedAt","weight","bodyFat","height"]` と、未知の id（ソート済み）。
    - 周径の設定のヘッダーは、固定列のあとに `CIRCUMFERENCE_ITEMS` の id がその順で並ぶ。
    - `toRow` → `fromRow` で値が往復する。
  - `record-dialog.test.tsx`：
    - タブが `["体調","身体","周径"]` の順。
    - 身体で体重 60.2 を保存すると、`bodyRecords` に1件入り、`circumferenceRecords` は0件。
    - 周径で `armWristLeft` に 15.0 を保存すると、逆になる。
    - 修正で開くと、その種類のフォームだけが出る（タブなし）。
  - `timeline-section.test.tsx`：同じ時刻の身体と周径の記録が、別の行として出る。
  - `sync-engine.test.ts`：`Measurements` タブを読みも書きもしない（モックの呼び出しに `Measurements` が出てこない）。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/storage src/features/measurements src/features/timeline src/features/sync` / Expected: FAIL
- [ ] **Step 3: 実装する**
  - Dexie v11 は、上の「Global Constraints」のとおりに書く。v10 と同じく、移行の処理は書かない。
  - `clearAllRecords` / `countAllRecords`：`measurements` の代わりに `bodyRecords`（tombstone 名 `BodyMeasurements`）と `circumferenceRecords`（`Circumference`）を扱う。
  - `history-graph-query`：体重・体脂肪・身長・BMI は `bodyRepository`、周径は `circumferenceRepository` から読む。
  - `history-query`（カレンダーの印）：両テーブルを読む。
  - データ管理画面：身体と周径の書き出しボタンを2つにする（ファイル名は `body.csv`、`circumference.csv`）。
  - CSV の生成は `generateMeasurementsCsv(records, items)` に `items` 引数を足して使う。
  - `BodyForm` の BMI は、入力中の身長、なければ `bodyRepository.findLatestValueAt("height", recordedAt, { excludeId })` を使う。
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(measurements): store, sync and edit body and circumference separately"`

---

### Task 4: データ層の契約とレジストリ（同期・CSV・削除・カレンダーをレジストリから）

**Files:**
- Create: `src/features/modules/types.ts`（データ層の型。画面層の型は Task 5 で足す）、`src/features/modules/period.ts`、`src/features/modules/data-registry.ts`
- Create: `src/features/modules/wellness/data.ts`
  - 体調のリポジトリを `src/features/storage/wellness-entries.repository.ts` から移す（git mv）。
  - 体調の同期設定を `sync-config.ts` から移す。
- Modify: `src/features/modules/body/data.ts`、`circumference/data.ts`
- Modify: `sync-config.ts`、`clear-all-records.ts`、`history-query.ts`、`data-management.tsx`、`history-csv.ts`（各モジュールの CSV 生成は各 `data.ts` へ移す）
- Test: `src/features/modules/period.test.ts`、`src/features/modules/data-registry.test.ts`、既存テストの import 先を直す

**Interfaces:**
- Produces:
  ```ts
  // period.ts
  /** start / end はローカル ISO（オフセット付き）の時刻。両端を含む。 */
  export type Period = { start: string; end: string };
  export function periodDayKeys(period: Period): { start: string; end: string };      // toDayKey で日付キーへ
  export function isWithinPeriod(at: string, period: Period): boolean;               // Date.parse で比較
  export function isValidPeriod(period: Period): boolean;                             // start <= end
  // types.ts
  export type ModuleRecord = { id: string; date: string; recordedAt: string };
  export type RecordModuleData<R extends ModuleRecord = ModuleRecord> = {
    id: string;
    syncConfigs: TableSyncConfig[];
    /** 同期と全削除のトランザクションに含めるテーブル。 */
    tables(): Table<any, any>[];
    listForDay(date: string): Promise<R[]>;                 // 古い順
    listInPeriod(period: Period): Promise<R[]>;             // 古い順、isWithinPeriod で絞る
    /** その月（YYYY-MM）に記録のある日付キー。 */
    datesWithRecordsInMonth(month: string): Promise<Set<string>>;
    /** 全削除。tombstone を記録する。呼び出し側のトランザクション内で動くこと。 */
    clearAll(): Promise<void>;
    count(): Promise<number>;
    csv: { fileName: string; exportLabelKey: keyof Messages; generate(): Promise<string> };
  };
  // data-registry.ts
  /** 関数にするのは循環 import 対策（Task 2 の tableSyncConfigs と同じ理由）。毎回同じ配列を返す。 */
  export function recordModuleData(): readonly RecordModuleData[]; // [wellnessData, bodyData, circumferenceData]
  export function getModuleData(id: string): RecordModuleData | undefined;
  // wellness/data.ts, body/data.ts, circumference/data.ts
  export const wellnessData: RecordModuleData<WellnessEntry>;
  export const bodyData: RecordModuleData<MeasurementRecord>;
  export const circumferenceData: RecordModuleData<MeasurementRecord>;
  ```
- `sync-config.ts` の `tableSyncConfigs()` の順番：
  1. `exerciseLogs`
  2. `...recordModuleData().flatMap((m) => m.syncConfigs)`
  3. `watchEvents`、`dailySelfCare`、`exercises`、`selfCareCatalog`、`tombstones`
  - `syncedDbTables()` には、運動・視聴・セルフケア・カタログ・tombstone と、`recordModuleData().flatMap((m) => m.tables())` を入れる。
  - 循環 import を避けるため、モジュールの `data.ts` は `sync-config.ts` から `TableSyncConfig` を **型だけ** import する。補助関数は `sync-helpers.ts` から取る。
- `clearAllRecords`：運動・視聴に加えて、`recordModuleData()` の全モジュールを1つのトランザクションで消す（OFF のモジュールも含む）。`countAllRecords` も同様。
- `listCalendarMarksInMonth(month: string, enabledModuleIds: readonly string[])`：
  - 「記録だけの日」は、運動・視聴と、ON のモジュールの `datesWithRecordsInMonth` から決める。
  - 運動のある日の優先は今と同じ。
- データ管理画面の書き出しボタン：運動・視聴・動画ライブラリのボタンは今のまま。モジュールのボタンは `recordModuleData()` の順に `csv.exportLabelKey` で並べる（OFF も含む）。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  // period.test.ts
  const P = { start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" };
  it("includes both ends and excludes just outside", () => {
    expect(isWithinPeriod("2026-10-01T09:00:00+09:00", P)).toBe(true);
    expect(isWithinPeriod("2026-10-27T18:00:00+09:00", P)).toBe(true);
    expect(isWithinPeriod("2026-10-01T08:59:59+09:00", P)).toBe(false);
  });
  it("compares instants across offsets", () => {
    expect(isWithinPeriod("2026-10-01T00:30:00+00:00", P)).toBe(true); // = 09:30 JST
  });
  it("isValidPeriod rejects start after end", () => { expect(isValidPeriod({ start: P.end, end: P.start })).toBe(false); });
  // data-registry.test.ts
  it("lists wellness, body, circumference with unique ids and tab names", () => { ... });
  it("listInPeriod drops records outside the instants on boundary days", async () => {
    // bodyRecords に 10/01 08:00 と 10/01 10:00 → P では 10:00 の1件だけ
  });
  it("clearAll records tombstones under each module's tab name", async () => { ... });
  ```
  - 既存の `history-screen.test.tsx`（カレンダーの印）に、身体が OFF のときは身体だけの日に印が付かないケースを足す。ここでは `listCalendarMarksInMonth` の直接テストでもよい。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/modules src/features/history` / Expected: FAIL
- [ ] **Step 3: 実装する**（上の Interfaces のとおり。体調の同期設定・CSV は中身を変えずに移す）
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(modules): data-layer module contract and registry drive sync, CSV and clearing"`

---

### Task 5: 画面層の契約、「＋記録する」のシート、汎用のタイムライン

**Files:**
- Modify: `src/features/modules/types.ts`（画面層の型を足す）、`module-settings.ts`（`useModuleSettings` を足す）
- Create:
  - `src/features/modules/registry.ts`
  - `src/features/modules/{wellness,body,circumference}/module.tsx`
  - `src/features/modules/components/add-record-sheet.tsx`、`module-record-dialog.tsx`
- Move: `src/features/timeline/components/wellness-entry-dialog.tsx`、`wellness-score-input.*` → `src/features/modules/wellness/`
- Modify: `timeline/build-timeline.ts`、`use-day-timeline.ts`、`components/day-timeline.tsx`、`components/timeline-section.tsx`、ja/en
- Delete: `timeline/components/record-dialog.tsx`、`record-dialog.test.tsx`（中身のテストは下の新しいテストへ移す）
- Test:
  - `src/features/modules/registry.test.ts`
  - `src/features/modules/components/add-record-sheet.test.tsx`
  - `src/features/modules/components/module-record-dialog.test.tsx`
  - `timeline/build-timeline.test.ts`、`timeline-section.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1 の設定関数
  - Task 3 の `BodyForm` / `CircumferenceForm` / `MeasurementFormProps`
  - Task 4 の `RecordModuleData`、`recordModuleData()`
- Produces:
  ```ts
  // types.ts
  export type TimeLabel = WellnessLabel;   // build-timeline の "morning" | "beforeVideo" | "afterVideo" | "night" を名前だけ変えて再 export
  export type RecordFormProps<R> = { onOpenChange(open: boolean): void; date: string; record?: R; onSaved(record: R): void; onDeleted?(): void };
  export type RecordModule<R extends ModuleRecord = ModuleRecord> = {
    data: RecordModuleData<R>;
    labelKey: keyof Messages;          // 「体調」「身体」「周径」
    descriptionKey: keyof Messages;    // 設定画面の短い説明
    editTitleKey: keyof Messages;
    icon: LucideIcon;                  // Smile / Scale / Ruler
    color: string;                     // タイムラインの点の色
    Form: ComponentType<RecordFormProps<R>>;
    TimelineCard: ComponentType<{ record: R; label: TimeLabel | null }>;
    HistoryView: ComponentType;        // Task 6 で中身を作る。この Task では null を返す仮の部品
    SummaryCard: ComponentType<{ period: Period }>; // Task 9 で中身を作る。この Task では null を返す仮の部品
  };
  // registry.ts
  export const RECORD_MODULES: readonly RecordModule[]; // recordModuleData() と同じ順・同じ data オブジェクト
  export function getRecordModule(id: string): RecordModule | undefined;
  // module-settings.ts
  export function useModuleSettings(): {
    settings: ModuleSettings;
    enabledModules: readonly RecordModule[];               // 設定の順
    entries: readonly { module: RecordModule; enabled: boolean }[]; // 設定の順、全モジュール
    setEnabled(id: string, enabled: boolean): void;
    move(id: string, toIndex: number): void;
  };
  // add-record-sheet.tsx
  export function AddRecordSheet(props: { open: boolean; onOpenChange(open: boolean): void; modules: readonly RecordModule[]; onChoose(module: RecordModule): void }): JSX.Element;
  // module-record-dialog.tsx
  export function ModuleRecordDialog(props: { module: RecordModule; open: boolean; onOpenChange(open: boolean): void; date: string; record?: ModuleRecord; onSaved(id: string): void; onDeleted?(): void }): JSX.Element;
  // build-timeline.ts
  export type TimelineItem =
    | { kind: "module"; moduleId: string; id: string; at: string; record: ModuleRecord; label: WellnessLabel | null }
    | { kind: "watch"; ... }      // 今のまま
    | { kind: "exercise"; ... };  // 今のまま
  export function buildTimeline(input: { moduleRecords: { moduleId: string; records: ModuleRecord[] }[]; watches: WatchEvent[]; logs: ExerciseLog[]; titles: Map<string, string> }): TimelineItem[];
  // use-day-timeline.ts
  export function useDayTimeline(date: string, modules: readonly RecordModule[]): DayTimelineState; // modules の id 列が変わったら読み直す
  ```
- 同じ時刻の並び順：`moduleRecords` の並び（＝設定の順）、視聴、運動の順。
- ラベル（朝・動画の前・動画の後・夜）は、どのモジュールの記録にも `labelAt` で付ける。
- シートは `Sheet side="bottom"` を使う。
  - 見出しは「何を記録しますか？」。
  - ON のモジュールを 4 列のタイル（アイコン＋表示名）で並べる。
  - 0 件なら「設定で記録する項目をONにしてください」と出し、`/settings` へのリンクを置く。
  - タイルを押すと、シートを閉じて `onChoose` を呼ぶ。
- ダイアログの見出し：新規は `record_add_title`（今のまま）。修正は `module.editTitleKey`。
- 今の「最後に開いた記録の種類」（`exerlog-record-kind`）はやめる。
- `TimelineSection`：
  - 「＋記録する」でシートを開き、選ばれたモジュールの `ModuleRecordDialog` を開く。
  - タイムラインのモジュール行を押すと、`getRecordModule(item.moduleId)` の `ModuleRecordDialog` を修正で開く。
  - 視聴・運動の行は今のまま。
- i18n（ja）：
  - 足すキー：
    - `module_wellness_label: "体調"`、`module_wellness_description: "からだ・こころの調子"`
    - `module_body_label: "身体"`、`module_body_description: "体重・身長・体脂肪"`
    - `module_circumference_label: "周径"`、`module_circumference_description: "腕・脚の左右"`
    - `record_sheet_title: "何を記録しますか？"`
    - `record_sheet_none_enabled: "設定で記録する項目をONにしてください"`、`record_sheet_open_settings: "設定を開く"`
  - 消すキー：`record_kind_*`、`record_kind_label`。
  - en も同様に足し・消す。

- [ ] **Step 1: 失敗するテストを書く**
  - `registry.test.ts`：`RECORD_MODULES.map((m) => m.data)` が `recordModuleData()` と同じ配列（同じ参照、同じ順）である。
  - `add-record-sheet.test.tsx`：
    - タイルが渡した順（例：周径、体調）で並ぶ。
    - 押すと `onChoose` が周径のモジュールで呼ばれ、`onOpenChange(false)` が呼ばれる。
    - 空配列なら「設定で記録する項目をONにしてください」と出る。
  - `module-record-dialog.test.tsx`：旧 `record-dialog.test.tsx` のフォームごとのケース（体調・身体・周径の保存と修正と削除）を、`getRecordModule(id)!` を渡して実行する。
  - `build-timeline.test.ts`：同じ時刻なら、`moduleRecords` の順、視聴、運動の順になる。
  - `timeline-section.test.tsx`：
    - 「＋記録する」→「身体」→ 体重を保存すると、タイムラインに身体の行が出る。
    - localStorage で身体を OFF にして描画し直すと、身体の行が消え、シートに「身体」のタイルがない。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/modules src/features/timeline` / Expected: FAIL
- [ ] **Step 3: 実装する**
  - `useModuleSettings` は `useSyncExternalStore(subscribeModuleSettings, () => readModuleSettings(ids), () => resolveModuleSettings(null, ids))` で作る。
  - `TodayScreen` と `HistoryDayTimeline` は `useModuleSettings().enabledModules` を `useDayTimeline` に渡す。
  - `DayTimeline` のモジュール行は、`module.TimelineCard` で描き、点の色は `module.color` にする。
  - 各 `TimelineCard` の見た目は今の行と同じにする。
    - 体調：今の文言。
    - 身体：`formatMeasurementSummary(record, BODY_ITEMS, t)`。
    - 周径：`formatMeasurementSummary(record, CIRCUMFERENCE_ITEMS, t)`。
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(modules): add-record sheet and module-driven timeline"`

---

### Task 6: 履歴のチップとモジュールごとの見返し画面

**Files:**
- Create:
  - `src/features/history/range-presets.tsx`（`history-graphs.tsx` の `getDateRangeForPreset` とボタン群を移す）
  - `src/features/history/components/metric-graph-view.tsx`、`history-module-tabs.tsx`
  - `src/features/modules/wellness/graph.ts`、`body/graph.ts`（`history-graph-query.ts` の該当部分を移す）
- Modify:
  - `src/features/modules/{wellness,body,circumference}/module.tsx`（`HistoryView`）
  - `history-screen.tsx`、`history-dashboard.tsx`、`use-history-state.ts`、ja/en
- Delete: `history/history-graph-query.ts`（+test。テストは各モジュールの `graph.test.ts` へ移す）、`history/components/history-graphs.tsx`（+test。テストは `metric-graph-view.test.tsx` へ移す）
- Test:
  - `src/features/history/components/history-module-tabs.test.tsx`
  - `metric-graph-view.test.tsx`
  - `src/features/modules/{wellness,body}/graph.test.ts`
  - `history-screen.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // range-presets.tsx
  export type DateRangePreset = "7d" | "30d" | "90d" | "all";
  export type DayRange = { start: string; end: string };   // 日付キー
  export function getDateRangeForPreset(preset: DateRangePreset, today?: Date): DayRange;
  export function RangePresetButtons(props: { value: DateRangePreset; onChange(p: DateRangePreset): void }): JSX.Element;
  // metric-graph-view.tsx
  export type GraphPoint = { at: string; value: number };
  export type GraphSeries = { unit: string; decimals: number; points: GraphPoint[] };
  export type GraphMetric = { key: string; labelKey: keyof Messages; load(range: DayRange): Promise<GraphSeries> };
  /** 項目の選択＋期間ボタン＋HistoryChart。今の HistoryGraphs の見た目を引き継ぐ。 */
  export function MetricGraphView(props: { metrics: readonly GraphMetric[] }): JSX.Element;
  // history-module-tabs.tsx
  /** includeAll: true なら先頭に「すべて」。allContent はそのときの中身。 */
  export function HistoryModuleTabs(props: { modules: readonly RecordModule[]; includeAll: boolean; allContent?: ReactNode }): JSX.Element;
  // wellness/graph.ts, body/graph.ts
  export const WELLNESS_GRAPH_METRICS: readonly GraphMetric[]; // からだ, こころ
  export const BODY_GRAPH_METRICS: readonly GraphMetric[];     // 体重, 体脂肪, 身長, BMI（今の順）
  ```
- `HistoryView` の中身：
  - 体調：`<MetricGraphView metrics={WELLNESS_GRAPH_METRICS} />`
  - 身体：`<MetricGraphView metrics={BODY_GRAPH_METRICS} />`
  - 周径：期間ボタン＋`CircumferenceGraph`（`buildCircumferenceSeries` は周径モジュールへ移し、`circumferenceRepository` から読む）
- チップは `role="tablist"` / `role="tab"` にする。ラベルは「すべて」と各 `labelKey`。
  - 選んでいたモジュールが OFF になったら、「すべて」（`includeAll: false` のときは先頭のモジュール）に戻る。
- **スマホ（`HistoryScreen`）**：
  - `HistoryModuleTabs includeAll` を使う。
  - 「すべて」の中身は、カレンダー＋選んだ日のタイムライン（今の「まとめ」）。
  - 「まとめ／グラフ」の切り替えはなくす。
- **PC（`HistoryDashboard`）**：
  - 左の列は今のまま、カレンダー＋タイムライン。
  - 右の列は `HistoryModuleTabs includeAll={false}` にする。
  - ON のモジュールが 0 件なら、右の列には「記録する項目がありません」と出す。
- カレンダーの印は、`useHistoryState` が `enabledModules` の id を `listCalendarMarksInMonth` に渡して作る。id が変わったら読み直す。
- i18n（ja）：
  - 足すキー：`history_chip_all: "すべて"`、`history_chips_label: "表示する記録"`、`history_no_modules: "記録する項目がありません"`
  - 消すキー：`history_mode_summary`、`history_mode_graphs`。
  - en も同様に足し・消す。

- [ ] **Step 1: 失敗するテストを書く**
  - `history-module-tabs.test.tsx`：
    - チップが「すべて」→ 渡した順に並ぶ。
    - 「周径」を押すと、周径の `HistoryView` が出る。
    - 周径を外した `modules` で描画し直すと、「すべて」が選ばれた状態に戻る。
  - `wellness/graph.test.ts`、`body/graph.test.ts`：旧 `history-graph-query.test.ts` の体調・体重・BMI のケースを、`metric.load(range)` で実行する。
  - `history-screen.test.tsx`：「まとめ」「グラフ」のボタンがなく、「すべて」のチップがある。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/history src/features/modules` / Expected: FAIL
- [ ] **Step 3: 実装する**（上の Interfaces のとおり）
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(history): module chips with per-module history views"`

---

### Task 7: 設定画面の「記録する項目」（ON/OFF と並べ替え）

**Files:**
- Modify: `package.json`、`package-lock.json`（`npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`）
- Create: `src/features/modules/components/module-settings-section.tsx`
- Modify: `src/features/settings/components/settings-screen.tsx`（テーマの欄の次に、カードを1枚足す）、ja/en
- Test: `src/features/modules/components/module-settings-section.test.tsx`

**Interfaces:**
- Consumes: Task 5 の `useModuleSettings`
- Produces: `export function ModuleSettingsSection(): JSX.Element`
- 1行の中身：ドラッグの取っ手（`GripVertical`、`aria-label`「並べ替え」）、アイコン、表示名、短い説明、「上へ」「下へ」ボタン、`Switch`（`aria-label` は表示名）。
  - 先頭の行の「上へ」と、末尾の行の「下へ」は `disabled` にする。
- ドラッグには `DndContext` + `SortableContext`（`verticalListSortingStrategy`）を使い、センサーは `PointerSensor`・`TouchSensor`・`KeyboardSensor` にする。
  - 落としたら `move(id, newIndex)` を呼ぶ。
- i18n（ja）：
  - `settings_modules_section_heading: "記録する項目"`
  - `settings_modules_hint: "ONにした順に「＋記録する」に並びます"`
  - `settings_module_reorder: "並べ替え"`、`settings_module_move_up: "上へ"`、`settings_module_move_down: "下へ"`
  - en も足す。

- [ ] **Step 1: 失敗するテストを書く**
  - 初期表示：行が「体調」「身体」「周径」の順で、すべてのスイッチが `aria-checked="true"`。
  - 「周径」の「上へ」を2回押すと、行の順が「周径」「体調」「身体」になる。localStorage の `lymly-record-modules` の `order` も同じ。
  - 「身体」のスイッチを押すと、`disabled` に `"body"` が入る。同じ画面に並べた `AddRecordSheet`（`enabledModules` を渡す）から「身体」のタイルが消える。
  - 先頭の「上へ」は無効になっている。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/modules/components/module-settings-section.test.tsx` / Expected: FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(settings): toggle and reorder record modules"`

---

### Task 8: 体調が OFF のときのおすすめ運動

**Files:**
- Create: `src/features/modules/wellness/condition.ts`
- Modify: `src/features/today/use-today-data.ts`
- Test: `src/features/modules/wellness/condition.test.ts`、`src/features/today/today-screen.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // wellness/condition.ts — 運動の機能が体調モジュールを読む唯一の入り口
  export type ConditionScores = { physicalScore: WellnessScore; mentalScore: WellnessScore };
  /** その日の最新の体調。なければ null。 */
  export function getLatestConditionScores(dayKey: string): Promise<ConditionScores | null>;
  ```
- `useTodayData`：
  - `useModuleSettings()` で体調が ON かどうかを見る。
  - OFF のときは `getLatestConditionScores` を呼ばず、`DEFAULT_SCORES`（からだ 3・こころ 3、記録がないときと同じ）を使う。
  - ON/OFF が変わったら読み直す。
  - `use-today-data.ts` は `wellness-entries.repository` を直接 import しない。

- [ ] **Step 1: 失敗するテストを書く**
  - `today-screen.test.tsx`：
    - その日に からだ1・こころ1 の体調があると、おすすめに強度 `high` の運動が出ない（今の挙動）。
    - 体調を OFF にした設定で描画すると、`high` も含む標準のおすすめになる。
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/today src/features/modules/wellness` / Expected: FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(today): recommendations ignore wellness when the module is off"`

---

### Task 9: 期間のまとめ

**Files:**
- Create:
  - `src/features/modules/{wellness,body,circumference}/summary.ts`（集計の純粋関数）
  - `src/features/period-summary/exercise-summary.ts`
  - `src/features/period-summary/components/period-summary-dialog.tsx`
- Modify:
  - 各 `module.tsx`（`SummaryCard` の中身）
  - `history-screen.tsx`・`history-dashboard.tsx`（「すべて」の中身と、PC の左の列の、カレンダーの上に「期間でまとめる」ボタン）
  - ja/en
- Test:
  - `src/features/modules/{wellness,body,circumference}/summary.test.ts`
  - `src/features/period-summary/exercise-summary.test.ts`
  - `src/features/period-summary/components/period-summary-dialog.test.tsx`

**Interfaces:**
- Consumes: Task 4 の `Period`、`isValidPeriod`、`listInPeriod`、Task 5 の `useModuleSettings`
- Produces:
  ```ts
  // wellness/summary.ts
  export type ScoreStats = { average: number; min: number; max: number };
  export function summarizeWellness(entries: WellnessEntry[]): { count: number; physical: ScoreStats; mental: ScoreStats } | null; // 0件は null
  // body/summary.ts
  export type FirstLast = { first: number; last: number; diff: number; min: number; max: number };
  export function summarizeBody(records: MeasurementRecord[], heightAtLastWeight: number | null):
    { count: number; weight: FirstLast | null; bodyFat: FirstLast | null; bmi: number | null } | null;
  // circumference/summary.ts
  export type SiteSummary = { limb: Limb; site: CircumferenceSite;
    left: { first: number; last: number; diff: number } | null;
    right: { first: number; last: number; diff: number } | null;
    sideDiffFirst: number | null; sideDiffLast: number | null };  // 右−左。同じ記録に左右がそろうときだけ
  export function summarizeCircumference(records: MeasurementRecord[]): { count: number; sites: SiteSummary[] } | null; // 記録のない部位は sites に入れない
  // exercise-summary.ts
  export function summarizeExercise(logs: ExerciseLog[], titles: Map<string, string>):
    { count: number; totalSeconds: number; top: { title: string; count: number }[] } | null; // top は回数の多い順に最大3件、同数はタイトル順
  export function listExerciseLogsInPeriod(period: Period): Promise<ExerciseLog[]>;
  // period-summary-dialog.tsx
  export function defaultPeriod(now?: Date): Period;  // 30日前の同時刻〜今
  export function PeriodSummaryDialog(props: { open: boolean; onOpenChange(open: boolean): void; initialPeriod?: Period }): JSX.Element;
  ```
- **ダイアログの中身**：
  - 開始と終了の `<input type="datetime-local">`。ラベルは「開始」「終了」。
  - ON のモジュールの `SummaryCard` を設定の順に並べ、最後に運動のカードを置く（運動のカードは常に出す）。
  - 開始が終了より後なら、カードの代わりに「開始は終了より前にしてください」と出す。
- **各カード**：
  - 見出しはモジュールの表示名、運動は「運動」。
  - 集計が `null` なら「記録なし」とだけ出す。
- **数値の丸め**：
  - 体調の平均は小数1桁。
  - 体重・体脂肪・周径・差は、各項目の `decimals` で丸める。差は周径の `formatDelta` と同じく、＋／−／± を付ける。
  - BMI は小数1桁。
  - 合計時間は `formatDuration`。
- **身体の BMI**：期間内で最後の体重の記録の時刻を `at` として、`bodyRepository.findLatestValueAt("height", at)` で身長を得る。
- **左右差の「最初」と「最後」**：左右の両方を含む記録のうち、期間内で最初のものと最後のものを使う。
- i18n（ja）：
  - `period_summary_button: "期間でまとめる"`、`period_summary_title: "期間のまとめ"`
  - `period_start: "開始"`、`period_end: "終了"`、`period_invalid: "開始は終了より前にしてください"`
  - `period_no_records: "記録なし"`、`period_count: "{count}件"`
  - `period_exercise_heading: "運動"`、`period_exercise_total: "合計 {duration}"`、`period_exercise_top: "よく行った運動"`
  - `period_first_last: "{first} → {last}（{diff}）"`、`period_min_max: "最低 {min}・最高 {max}"`、`period_average: "平均 {value}"`
  - `period_side_diff: "左右差 {first} → {last}"`
  - en も足す。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  it("summarizeWellness averages to one decimal and finds min/max", () => {
    expect(summarizeWellness([e(2, 4), e(3, 5), e(5, 3)])).toEqual({ count: 3,
      physical: { average: 3.3, min: 2, max: 5 }, mental: { average: 4, min: 3, max: 5 } });
    expect(summarizeWellness([])).toBeNull();
  });
  it("summarizeBody uses first/last by time and BMI from the given height", () => {
    // weight 61.0 (10/02), 60.2 (10/20) → first 61.0 last 60.2 diff -0.8; height 160 → bmi 23.5
  });
  it("summarizeBody omits BMI without height", () => { /* heightAtLastWeight null → bmi null */ });
  it("summarizeCircumference skips unrecorded sites and pairs sides only within a record", () => {
    // 記録A: armWristLeft 15.0 だけ、記録B: armWristLeft 15.4 / armWristRight 16.0
    // → armWrist: left 15.0→15.4 diff +0.4, right 16.0→16.0 diff 0, sideDiffFirst 0.6, sideDiffLast 0.6
    // ほかの部位は sites に無い
  });
  it("summarizeExercise ranks top 3 by count then title", () => { ... });
  // period-summary-dialog.test.tsx
  it("shows enabled module cards in settings order, then exercise", async () => { /* 周径を先頭に並べ替え・体調 OFF → 見出し順 ["周径","身体","運動"] */ });
  it("shows 記録なし for a module without records in the period", async () => { ... });
  it("shows the invalid message and no cards when start is after end", async () => { ... });
  it("defaultPeriod is 30 days before now to now", () => { ... });
  ```
- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run src/features/period-summary src/features/modules` / Expected: FAIL
- [ ] **Step 3: 実装する**（上の Interfaces のとおり）
- [ ] **Step 4: 成功を確認** — Run: `npm test && npx tsc --noEmit` / Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(history): period summary across modules and exercise"`

---

### Task 10: 仕上げの確認

- [ ] **Step 1**：`npm test && npx tsc --noEmit && npm run lint` がすべて通ることを確かめる。
- [ ] **Step 2**：`grep -rn "appDb.measurements\|measurements.repository\|RecordDialog\b\|history_mode_\|record_kind_" src` が 0 件であることを確かめる。
- [ ] **Step 3**：モジュールのフォルダが、ほかのモジュールを import していないことを確かめる。
  - `grep -rn "modules/\(wellness\|body\|circumference\)" src/features/modules/{wellness,body,circumference}` を実行し、自分のフォルダ以外への import が 0 件であること。
- [ ] **Step 4**：`npm run dev` で開き、スマホ幅とPC幅で次の流れを目で確かめる。
  - 「＋記録する」→ シート → 身体を保存 → タイムラインに出る
  - 設定で周径を先頭へ移し、身体を OFF にする → シートと履歴のチップに反映される
  - 履歴の「期間でまとめる」→ カードが出る
- [ ] **Step 5**：spec の「状態」を「実装済み」にして Commit — `git commit -m "docs: mark record modules foundation implemented"`
