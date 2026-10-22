# 体の数値の時刻付き記録（項目一覧で拡張可能）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 身長・体重・体脂肪率を、時刻付きで何件でも記録できるようにする。

**Architecture:**
- **記録の形**：新しいテーブル `measurements` に、1件 = `{values: 項目id→数値}` の形で保存する。
- **項目一覧**：`MEASUREMENT_ITEMS` を唯一の項目定義にする。次のものはすべてこの一覧を読んで動く。
  - 記録画面
  - タイムライン
  - グラフ
  - 同期の列
  - CSV
  - 体調画面
- **入口**：入口は「＋ 記録する」1つにする。開いた `RecordDialog` の中で「体調」と「体の数値」を切り替える。
- **同期**：このタブだけ、見出しの名前で列を対応させる方式にする。
- **グラフ**：記録した時刻ごとに、すべての点を描く。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4.0.10、Recharts、Vitest + fake-indexeddb + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-22-timed-body-measurements-design.md`

## Global Constraints

- 既存データの移行は書かない。`dailyMetrics` テーブルと、シートの `DailyMetrics` タブは使わなくなる（タブは読まず・書かず・消さない）。
- 新しい依存パッケージは追加しない。
- 時刻はオフセット付きのローカル ISO 文字列にする（`localIsoAt` / `localIsoNow`）。`date` は `YYYY-MM-DD`。
- 画面の文言は `src/features/i18n/messages/{ja,en}.ts` を通す（ja と en の両方に追加する）。
- 項目の id は、シートの固定列名 `id`、`date`、`recordedAt`、`note`、`updatedAt` と重複してはならない。
- 体の数値を記録するときは、体調の点数を求めない。
- 前回の値は入力欄に薄く表示する（placeholder）だけにする。入力しなかった項目は保存しない。
- 値が1つもない体の数値の記録は保存できない（保存ボタンを押せない状態にする）。
- 修正するときは、画面に出ていない項目の値を消さない。
- 削除するときは、`recordTombstones("Measurements", ids)` で削除記録を残す。データを変える関数は最後に `scheduleSync()` を呼ぶ。
- BMI は数値だけを小数1桁で出し、判定は出さない。身長がなければ `bmi_need_height` を出す。
- 小数の桁数（グラフ・ツールチップ・表示）は、各項目の `decimals` に従う。
- 合格の条件（前回から続くもの）：
  - `npx tsc --noEmit` で、テスト以外のファイルにエラーがない。
  - `npm test` で、新しく失敗するテストがない（main は既に19件失敗している。一覧はタスク開始時に記録する）。
  - `npm run lint` と `npm run build` が通る。

## Review Focus

- **コピー先で項目を1つ足したとき**：記録画面の入力欄、タイムラインの1行、グラフの選択肢、シートの列、CSV の列に、その項目が出る（Task 7 のテスト）。
- **シートの列が前回より増えた・減った・並びが変わったとき**：値は消えない。一覧にない列でも、数値のセルは残る（Task 2 のテスト）。
- **身長を入れずに体重だけを記録したとき**：保存されるのは体重だけになり、BMI は前回の身長で計算される（Task 4 のテスト）。
- **一覧から外した項目の値を持つ記録を、アプリで修正して保存したとき**：外した項目の値も残る（Task 1 と Task 4 のテスト）。
- **同じ日に3回測ったとき**：グラフにその日の3点が描かれ、ツールチップに時刻が出る（Task 6 のテスト）。

---

## File Structure

| ファイル | 役割 |
|---|---|
| `src/features/measurements/measurement-items.ts` | 新規。`MEASUREMENT_ITEMS`、`MeasurementItem` 型、`formatMeasurementValue` |
| `src/features/storage/measurements.repository.ts` | 新規。保存・修正・削除・一覧・前回値・最新値 |
| `src/lib/types.ts` | `MeasurementRecord` を追加。最後のタスクで `DailyMetricEntry` と `MetricType` を削除 |
| `src/features/storage/app-db.ts` | v9 で `measurements` を追加。v10 で `dailyMetrics: null` |
| `src/features/sync/{sync-config,sync-engine,google-sheets}.ts` | 見出しの名前で列を対応させる方式と、`Measurements` タブ |
| `src/features/timeline/build-timeline.ts`、`use-day-timeline.ts` | kind `"measurement"` |
| `src/features/timeline/components/record-dialog.tsx`、`measurement-form.tsx` | 新規。切り替え付きの記録画面 |
| `src/features/self-care/components/record-card.tsx` | 新規。体調カードと体の数値カードを統合したもの |
| `src/features/history/*` | 日別表示から体の数値の欄を外す。カレンダーの印、全点グラフ |
| `src/features/settings/csv/history-csv.ts`、`data-management.tsx`、`src/features/storage/clear-all-records.ts` | CSV 書き出しと全削除 |
| `README.md` | 「項目の足し方」の節 |

---

### Task 1: 項目一覧・記録の型・テーブル・repository

**Files:**
- Create:
  - `src/features/measurements/measurement-items.ts`（＋`.test.ts`）
  - `src/features/storage/measurements.repository.ts`（＋`measurements.repository.test.ts`）
- Modify:
  - `src/lib/types.ts`
  - `src/features/storage/app-db.ts`
  - `src/features/storage/clear-all-records.ts`（＋既存のテスト）
  - `messages/{ja,en}.ts`

**Interfaces:**
- Produces（items）:

```ts
export type MeasurementItem = {
  id: string; labelKey: keyof Messages; unit: string; decimals: number;
  min: number; max: number; showInGraph: boolean;
};
export const MEASUREMENT_ITEMS: readonly MeasurementItem[]; // 並び順 = 表示順
export const MEASUREMENT_FIXED_COLUMNS = ["id", "date", "recordedAt", "note", "updatedAt"] as const;
export function getMeasurementItem(id: string): MeasurementItem | undefined;
export function formatMeasurementValue(item: MeasurementItem, value: number): string; // value.toFixed(item.decimals)
```

  - 初期の項目は次の順で3つ。
    - 体重：`{id:"weight", labelKey:"measurement_item_weight", unit:"kg", decimals:1, min:1, max:500, showInGraph:true}`
    - 体脂肪率：`{id:"bodyFat", labelKey:"measurement_item_body_fat", unit:"%", decimals:1, min:1, max:99, showInGraph:true}`
    - 身長：`{id:"height", labelKey:"measurement_item_height", unit:"cm", decimals:1, min:30, max:300, showInGraph:true}`
  - 表示名は ja が「体重」「体脂肪率」「身長」、en が「Weight」「Body fat」「Height」。
  - 体重と身長の id は、BMI の計算でも使う（`"weight"` と `"height"` で固定）。
- Produces（type）:
  - `MeasurementRecord = { id: string; date: string; recordedAt: string; values: Record<string, number>; note: string; updatedAt: string }`
- Produces（repository）。表の名前の定数は `MEASUREMENTS_TABLE = "Measurements"`。
  - `addMeasurement(input: { date: string; values: Record<string, number>; note: string; recordedAt?: string }): Promise<MeasurementRecord>`
    - `values` が空なら `Error("empty measurement")` を投げる。
    - `recordedAt` を省いたときは `localIsoAt(date)` を使う。
    - `note` は前後の空白を落とす。
  - `updateMeasurement(record: MeasurementRecord): Promise<void>`
    - `updatedAt` を新しくする。
    - 渡された `values` をそのまま保存する。画面側で、一覧にない値も残して渡すこと。
  - `deleteMeasurement(id: string): Promise<void>`：削除記録も同じトランザクションで残す。
  - `listMeasurementsForDay(date): Promise<MeasurementRecord[]>`：記録時刻の昇順。
  - `listMeasurementsInRange(start, end): Promise<MeasurementRecord[]>`：記録時刻の昇順。
  - `findPreviousValues(at: string): Promise<Record<string, number>>`
    - 項目ごとに、`recordedAt < at` の中で一番新しい値を返す。
    - 一覧にない項目も含めてよい。
  - `findLatestHeightAt(at: string): Promise<number | null>`：`recordedAt <= at` の中で一番新しい height。
  - `getLatestMeasurementValues(): Promise<Record<string, { value: number; recordedAt: string }>>`：項目ごとの最新の値。
- Schema v9：`measurements: "id, date, recordedAt"` を追加する。それ以外の stores は v8 と同じにする（`dailyMetrics` も残す。消すのは Task 7）。
- `clearAllRecords` と `countAllRecords` の対象に `measurements` を加える。

- [ ] **Step 1: 失敗するテストを書く**
  - **items のテスト**
    - id がすべて重複していない。
    - どの id も `MEASUREMENT_FIXED_COLUMNS` と重ならない。
    - 各 `labelKey` が ja と en の両方に存在する。
    - `formatMeasurementValue(weight, 60.25)` が `"60.3"` になる。
  - **repository のテスト**（fake-indexeddb を使う）
    - `addMeasurement({date:"2026-10-22", values:{}, note:""})` は reject される。
    - 07:12 に `{weight:60.2}`、18:00 に `{weight:60.8, bodyFat:22}` を追加すると、`listMeasurementsForDay` がその2件を時刻順で返す。
    - `findPreviousValues("2026-10-22T18:00:00+09:00")` が `{weight:60.2}` を返す。前日に `{height:170}` もあれば、それも含める。
    - `findLatestHeightAt` は、身長が未記録なら null を返す。
    - `updateMeasurement` で `values:{weight:61, waist:80}`（`waist` は一覧にない）を保存し、読み直しても `waist:80` が残っている。
    - `deleteMeasurement` のあと、`listTombstones()` に `{table:"Measurements", recordId:id}` が含まれる。
    - `clearAllRecords` で `measurements` も空になり、削除記録が残る。
- [ ] **Step 2:** `npx vitest run src/features/measurements src/features/storage` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 上の interfaces どおりに実装する。
- [ ] **Step 4:** 同じコマンドと `npx tsc --noEmit` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: measurement item list and timed measurement records"`

---

### Task 2: 同期（見出しの名前で列を対応させる Measurements タブ）

**Files:**
- Modify:
  - `src/features/sync/sync-config.ts`
  - `src/features/sync/sync-engine.ts`（＋test）
  - `src/features/sync/google-sheets.ts`（＋test）
  - `src/features/sync/SyncProvider.tsx`（タブ表示名）
  - `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：`MEASUREMENT_ITEMS`、`MEASUREMENT_FIXED_COLUMNS`、`MeasurementRecord`
- Produces:
  - `TableSyncConfig` に次の2つを追加する。
    - `headerMode?: "exact" | "byName"`（既定は `"exact"`）
    - `buildHeaders?(records: any[]): string[]`（byName のときだけ使う）
  - byName のときは、`fromRow(row, headers)` に**シート側の実際の見出し**を渡す。
  - `toRow(record, headers)` は第2引数の見出しの順に並べる。exact の既存の設定は第2引数を無視してよい。
  - `SHEET_TABS` の `"DailyMetrics"` を `"Measurements"` に置き換える。`dailyMetricsConfig` は削除する。
  - `measurementsConfig` の中身:
    - `tabName: "Measurements"`、`keyColumn: "id"`、`updatedAtKey: "updatedAt"`、`deletable: true`、`headerMode: "byName"`
    - `buildHeaders(records)`：`[...MEASUREMENT_FIXED_COLUMNS, ...MEASUREMENT_ITEMS.map(i => i.id), ...（記録にあって一覧にない値の id を、名前順で）]`
    - `fromRow` の扱い:
      - 固定列以外の列で、`Number(cell)` が有限の数になるものだけを `values` に入れる。
      - 空のセルや数値でない文字は捨てる。
  - `parseRemoteRows` の byName のときの扱い:
    - 1行目が固定列をすべて含んでいれば、その見出しで読む。
    - 1つでも欠けていれば `[]` を返す（タブを空として扱う）。
  - 書き込むときの見出しは `buildHeaders(マージ後の記録)` にする。
  - SyncProvider のタブ表示名に `sync_tab_measurements` を追加する（ja「体の数値」、en「Body measurements」）。`sync_tab_daily_metrics` は削除する。

- [ ] **Step 1: 失敗するテストを書く**（sync-engine.test のシート fake を使う）
  - **列が足りないシート**：シートの見出しが `id,date,recordedAt,note,updatedAt,weight` の行があり、手元には `{bodyFat:22}` を含む別の記録がある。同期すると次のようになる。
    - 手元に両方の記録がある。
    - シートの見出しは `id,date,recordedAt,note,updatedAt,weight,bodyFat,height` になる。
    - 両方の行の値が保たれている。
  - **一覧にない列**：シートに `waist` 列があり、行に `80` と `abc` が入っている。同期すると次のようになる。
    - 1件目の `values.waist` は 80 になり、シートにも `waist` 列が残る。
    - 2件目には `waist` が入らない。
  - **固定列が欠けたシート**：シートの見出しが `id,date,weight`（`recordedAt` などがない）の場合、remote を空として扱い、新しい見出しで書き直す。
  - **古いタブ**：`DailyMetrics` タブがあっても、読みも書きもしない（そのタブへの fetch がない）。
  - **削除**：手元で削除した記録は、同期のあと手元にもシートにもない。
- [ ] **Step 2:** `npx vitest run src/features/sync` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat(sync): Measurements tab with header-name column mapping"`

---

### Task 3: タイムラインに体の数値を載せる

**Files:**
- Modify:
  - `src/features/timeline/build-timeline.ts`（＋test）
  - `src/features/timeline/use-day-timeline.ts`
  - `src/features/timeline/components/day-timeline.tsx`
  - `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：`listMeasurementsForDay`、`MEASUREMENT_ITEMS`、`formatMeasurementValue`
- Produces:
  - `TimelineItem` に `{ kind: "measurement"; id: string; at: string; record: MeasurementRecord; label: WellnessLabel | null }` を追加する。
  - `labelAt(at: string, watches: WatchEvent[], logs: ExerciseLog[]): WellnessLabel | null`
    - 今の `labelWellness` の本体を、時刻を受け取る形に一般化したもの。
    - `labelWellness(entry, …)` は `labelAt(entry.recordedAt, …)` を呼ぶだけにする。
  - `buildTimeline` の input に `measurements: MeasurementRecord[]` を追加する。同時刻のときの並び順は wellness → measurement → watch → exercise。
  - `formatMeasurementSummary(record: MeasurementRecord, t): string`（`day-timeline.tsx` 内、または `measurement-items.ts`）
    - 一覧の順に、値のある項目だけを「体重 60.2kg・体脂肪率 22.0%」の形でつなぐ。
    - 一覧にない項目は表示しない。
  - DayTimeline の体の数値の行は「📏 {summary}」とし、ラベルのタグを付ける。点の色は `#7a4fb0`。

- [ ] **Step 1: 失敗するテストを書く**
  - `buildTimeline` で、体の数値 07:12 と体調 07:12 は、wellness → measurement の順に並ぶ。
  - 体の数値 07:12 のラベルは `morning`、視聴 18:03 の直後 18:10 の体の数値は `afterVideo`。
  - `formatMeasurementSummary({values:{bodyFat:22, weight:60.2, waist:80}})` が「体重 60.2kg・体脂肪率 22.0%」になる。
- [ ] **Step 2:** `npx vitest run src/features/timeline` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する（`useDayTimeline` の `loadDay` でも measurements を読む）。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: show body measurements on the day timeline"`

---

### Task 4: 記録画面（切り替え付き）と「＋ 記録する」

**Files:**
- Create:
  - `src/features/timeline/components/record-dialog.tsx`
  - `src/features/timeline/components/measurement-form.tsx`
  - `src/features/timeline/components/record-dialog.test.tsx`
- Modify:
  - `src/features/timeline/components/wellness-entry-dialog.tsx`（中身のフォームを `WellnessForm` として外に出し、`RecordDialog` から使う）
  - `src/features/timeline/components/timeline-section.tsx`（＋test）
  - `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：Task 1 の repository、`calculateBmi`、`useSaveAndClose`、`TimeField`、`NumberField`、`TimelineDialogFooter`、`SaveButton`
- Produces:
  - `type RecordKind = "wellness" | "measurement"`
  - `RECORD_KIND_STORAGE_KEY = "exerlog-record-kind"`（localStorage を使う。読み書きは try/catch で囲み、失敗したら `"wellness"` にする）
  - `RecordDialog(props: { open; onOpenChange(open): void; date: string; editing?: { kind: "wellness"; entry: WellnessEntry } | { kind: "measurement"; record: MeasurementRecord }; onSaved(id: string): void; onDeleted?(): void })`
    - 新規のとき:
      - 上部に「体調」「体の数値」の切り替え（`role="tablist"`）を出す。
      - 最初に開く種類は前回使ったもの。切り替えると保存する。
      - 切り替えると、入力途中の内容は捨ててよい。
    - 編集のとき:
      - 切り替えは出さない。
      - `editing.kind` のフォームだけを出す。
  - `MeasurementForm`:
    - 時刻の欄、`MEASUREMENT_ITEMS` の順に並べた数値の欄（ラベル・単位付き）、メモの欄を持つ。
    - placeholder は `t("measurement_previous", { value: formatMeasurementValue(item, v) })`（ja「前回 {value}」、en「Last {value}」）。前回の値は `findPreviousValues(記録時刻)` から取る。値がなければ placeholder を出さない。
    - 入力された欄だけを `values` にする。全部空のときは保存できない。
    - BMI の表示は、次の順で決める。
      - 体重が入力されていれば、身長は「入力された値」→「`findLatestHeightAt(記録時刻)`」の順で探し、`t("bmi_value",{value: toFixed(1)})` を出す。
      - 身長がなければ `bmi_need_height` を出す。
      - 体重が空なら何も出さない。
    - 編集のときは既存の値で始める。保存するときは `{...record.values（一覧にない値も含む）, ...入力した値}` から、入力欄を空にした一覧の項目を除いて保存する。
  - `TimelineSection`:
    - 「＋ 体調を記録」ボタンを `t("timeline_add_record")`（ja「＋ 記録する」、en「+ Add record」）に置き換え、`RecordDialog` を開く。
    - 行を選んだときは、体調と体の数値の行を `RecordDialog` の編集で開く。
    - `timeline_add_wellness` は使わなくなれば削除する。

- [ ] **Step 1: 失敗するテストを書く**（`record-dialog.test.tsx` と `timeline-section.test.tsx`、fake-indexeddb を使う）
  - **新規の記録**
    - 「＋ 記録する」→「体の数値」→ 体重 60.2 → 保存 で、タイムラインに「📏 体重 60.2kg」が増える。保存された `values` は `{weight:60.2}` だけ。
    - 前日に `{height:170, bodyFat:22.4}` があると、体脂肪率の欄の placeholder は「前回 22.4」になる。体重 60 を入れると「BMI 20.8」が出る。保存された `values` に height と bodyFat は含まれない。
    - 全部の欄が空なら、保存ボタンは押せない。
  - **前回使った種類**
    - 一度「体の数値」に切り替えて閉じ、開き直すと、「体の数値」が選ばれている。
  - **編集**
    - `{weight:61, waist:80}` の記録を開いて体重を 62 にして保存すると、`waist:80` が残っている。編集の画面には切り替えがない。
    - 体脂肪率の欄を空にして保存すると、`bodyFat` は消える。
  - **体調**
    - 体調への切り替えと保存は今までどおり動く（既存の体調のテストを `RecordDialog` 経由に書き換える）。
- [ ] **Step 2:** `npx vitest run src/features/timeline` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** 同じコマンドと、`src/app/page.test.tsx`・`src/features/today` のテストを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: single + Add record entry with wellness/measurement switch"`

---

### Task 5: 体調の画面（/self-care）のカードを統合する

**Files:**
- Create: `src/features/self-care/components/record-card.tsx`
- Modify:
  - `src/features/self-care/components/self-care-screen.tsx`
  - `src/features/self-care/use-self-care-data.ts`
  - `src/features/self-care/self-care-screen.test.tsx`
  - `messages/{ja,en}.ts`
- Delete:
  - `src/features/self-care/components/metrics-card.tsx`
  - `src/features/self-care/components/wellness-card.tsx`

**Interfaces:**
- Consumes：`RecordDialog`、`getLatestMeasurementValues`、`findLatestHeightAt`、`calculateBmi`、`useSavedFlash`
- Produces:
  - `RecordCard({ date: string })` に次を並べる。
    - 見出し
    - 「＋ 記録する」（`RecordDialog` を開く。保存後はボタンが「✓ 保存しました」に変わる）
    - `MEASUREMENT_ITEMS` の順に「{表示名} {値}{単位}（{M/D HH:mm}）」。値がない項目は「—」にする。
    - 最新の体重と、その時点で最新の身長から計算した `bmi_value`。身長がないときは `bmi_need_height`、体重がないときは何も出さない。
  - `useSelfCareData` から、体の数値の状態と `save` と `bmi` を取り除く。セルフケアのチェックリストに必要なものだけを残す。

- [ ] **Step 1: 失敗するテストを書く**
  - 画面に「＋ 記録する」はちょうど1つ。体の数値の入力欄（spinbutton）は画面上にない。
  - 10/1 に `{height:170}`、10/22 07:12 に `{weight:60}` を入れると、カードに「体重 60.0kg（10/22 07:12）」と「BMI 20.8」が出る。
  - カードから体の数値を保存すると、最新の値の表示が新しくなり、「✓ 保存しました」が出る。
- [ ] **Step 2:** `npx vitest run src/features/self-care` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: merged record card on the condition screen"`

---

### Task 6: 履歴（日別表示・カレンダー・全点グラフ）

**Files:**
- Modify:
  - `src/features/history/history-query.ts`
  - `src/features/history/history-graph-query.ts`（＋test）
  - `src/features/history/components/history-graphs.tsx`（＋test）
  - `src/features/history/components/history-chart.tsx`（＋test）
  - `src/features/history/components/day-summary.tsx`（＋test）
  - `history-screen.test.tsx`
  - `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：`listMeasurementsInRange`、`MEASUREMENT_ITEMS`、`getMeasurementItem`、`calculateBmi`、`listWellnessEntriesInRange`
- Produces:
  - `GraphPoint = { at: string; value: number }`（`at` はオフセット付きの ISO 文字列）
  - `GraphSeries = { unit: string; decimals: number; points: GraphPoint[] }`
  - `GraphMetricSelection` は次の4種類にする。`{kind:"metric"}` は削除する。
    - `{ kind: "measurement"; itemId: string }`
    - `{ kind: "bmi" }`
    - `{ kind: "wellness"; score: "physical" | "mental" }`
    - `{ kind: "selfCare"; … }`（今のまま）
  - 各系列の作り方:
    - **measurement**：範囲内で、その項目の値を持つ記録の1件ごとに1点を作る。`at` は `recordedAt`、`unit` と `decimals` は項目に従う。
    - **bmi**：体重を持つ記録ごとに、その記録時刻以前で一番新しい身長を使って1点を作る。身長がなければその点は作らない。`unit ""`、`decimals 1`。
      - 身長は範囲の終わりまでのものを1回だけ読み、時刻順にたどる。記録ごとにデータベースを読み直さない。
    - **wellness**：体調の記録ごとに1点を作る（`recordedAt`）。日ごとの平均はやめる。`unit "/5"`、`decimals 0`。
    - **selfCare**：`at` を `${date}T00:00:00` にする。
  - `HistoryGraphs` の選択肢:
    - `MEASUREMENT_ITEMS.filter(i => i.showInGraph)` を一覧の順に並べ、そのあとに BMI、体調2種を並べる。
    - 表示名は項目の `labelKey` をそのまま使う。
    - 今の `history_graph_metric_weight` / `_body_fat` / `_height` のキーは削除する。
  - `HistoryChart`:
    - 横軸は `Date.parse(at)`（数値）にする。目盛りは「M/D」のままにする。
    - ツールチップは「M/D HH:mm」と、`value.toFixed(series.decimals)` と単位を出す。
  - `listCalendarMarksInMonth`：`measurements` しかない日も `"record"` にする。
  - `DaySummary` と `getHistoryDaySummary` から、体の数値（metrics）に関わる部分を削除し、セルフケアだけを残す。使わなくなったキー（`history_metrics_*`）も削除する。

- [ ] **Step 1: 失敗するテストを書く**
  - **graph-query**
    - 10/22 07:12 に 60.2、12:00 に 60.6、21:00 に 60.9 の体重を記録すると、measurement weight の系列が3点（`at` の昇順）になる。
    - 10/1 に身長 170、10/22 07:12 に体重 60 を記録すると、bmi の系列は `[{at:"2026-10-22T07:12:00+09:00", value:20.8}]` になる。
    - 同じ日にからだ 2 と 4 を記録すると、physical の系列は2点になる。
  - **chart**
    - 同じ日に2点ある系列を描くと、ツールチップの整形関数が「10/22 07:12」を返す（整形関数を export してテストする）。
  - **graphs**
    - 選択肢が「体重」「体脂肪率」「身長」「BMI」「からだの調子」「こころの調子」の順になっている（ja）。
  - **history-screen**
    - 体の数値だけの日のカレンダーのセルに `.history-calendar__dot` がある。
    - 日別表示に「体の数値」の見出しがない。
- [ ] **Step 2:** `npx vitest run src/features/history` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: history shows measurements; graphs plot every recorded point"`

---

### Task 7: CSV・古いテーブルの削除・項目追加のテストと README

**Files:**
- Modify:
  - `src/features/settings/csv/history-csv.ts`（＋test）
  - `src/features/settings/components/data-management.tsx`
  - `src/features/storage/app-db.ts`
  - `src/lib/types.ts`
  - `README.md`
  - `messages/{ja,en}.ts`
- Delete:
  - `src/features/storage/daily-metrics.repository.ts`
  - 残っている `DailyMetricEntry` / `MetricType` の参照
- Create: `src/features/measurements/add-item.integration.test.tsx`

**Interfaces:**
- Produces:
  - `generateMeasurementsCsv(records: MeasurementRecord[]): string`
    - 見出しは `date, recordedAt, note,` に続けて `MEASUREMENT_ITEMS` の id を順に並べる。
    - 値は `formatMeasurementValue` で整形する。値がない項目は空欄にする。
    - 時刻は `formatTimestampForCsv` で整形する。
  - `generateDailyMetricsCsv` は削除する。設定の書き出しボタンは「体の数値」（`settings_export_measurements`）に置き換える。
  - スキーマ v10 で `dailyMetrics: null` にし、ほかの stores は v9 と同じにする。
  - README に「体の数値の項目を足すには」の節を追加する。手順は次の2つで、日本語と英語の両方で書く。
    1. `src/features/measurements/measurement-items.ts` に1件足す。
    2. `messages/ja.ts` と `messages/en.ts` に表示名を足す。

- [ ] **Step 1: 失敗するテストを書く**
  - `history-csv.test`：`{weight:60.25, waist:80}` の記録を書き出すと、`weight` 列は `60.3`、`height` 列は空欄になり、`waist` 列はない。
  - `add-item.integration.test.tsx`
    - `vi.mock` で `MEASUREMENT_ITEMS` に `{id:"waist", labelKey:"measurement_item_weight", unit:"cm", decimals:1, min:1, max:300, showInGraph:true}` を足す。表示名のキーは既存のものを流用する。
    - そのうえで次を確かめる。
      - (a) `RecordDialog` の体の数値に、単位 cm の欄が4つ目として出る。
      - (b) `formatMeasurementSummary` に waist が含まれる。
      - (c) `measurementsConfig.buildHeaders([])` に `waist` が含まれる。
      - (d) `generateMeasurementsCsv` の見出しに `waist` が含まれる。
      - (e) グラフの選択肢が1つ増える。
- [ ] **Step 2:** `npx vitest run src/features/settings src/features/measurements` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。`grep -rn "dailyMetrics\|DailyMetricEntry\|MetricType" src --include=*.ts --include=*.tsx` に出るのは、`app-db.ts` の古い版の定義だけになること。
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run lint && npm run build` を実行する。テスト以外の型エラーがなく、新しい失敗がなく、ビルドが通ることを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "chore: measurements CSV, drop dailyMetrics, document adding items"`
