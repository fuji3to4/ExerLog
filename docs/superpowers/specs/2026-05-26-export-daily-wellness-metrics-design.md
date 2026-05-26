# Design: Export Migration from Condition to Daily Wellness + Metrics

**Date:** 2026-05-26  
**Status:** Approved

---

## Problem Statement

現在の履歴エクスポートは `conditions.csv`（`daily_condition` ベース）に依存しており、現行の体調管理モデル `dailyWellness` と整合していない。  
また、体調と合わせて管理している身体計測値（`height` / `weight` / `bodyFat`）をCSV出力できないため、バックアップ/分析用途で情報が欠落する。

---

## Goals

1. 体調エクスポートを旧 `condition` 形式から `dailyWellness` 形式へ移行する
2. 身体計測値（`height` / `weight` / `bodyFat`）をCSVで出力できるようにする
3. 既存の運動ログ・エクササイズのエクスポート動作は維持する
4. 設定画面の文言を新しいデータモデルに合わせる

---

## Non-Goals

- CSVインポート機能の追加/変更
- 旧 `conditions.csv` との併存出力
- エクスポート基盤の全面再設計

---

## Chosen Approach

推奨A案（最小変更で置き換え＋metrics追加）を採用する。

- `conditions.csv` を廃止し、`daily-wellness.csv` に置換
- 新規 `daily-metrics.csv` を追加
- 実装は既存 `history-csv.ts` と `DataManagement` の責務に収める

この方針により、変更範囲と回帰リスクを最小化しつつ、要件を完全に満たす。

---

## Architecture and Components

### `src/features/settings/components/data-management.tsx`

- `handleExportConditions` を `handleExportDailyWellness` に置換
- `appDb.dailyWellness.toArray()` を取得して `daily-wellness.csv` を出力
- `handleExportDailyMetrics` を追加し、`appDb.dailyMetrics.toArray()` から `daily-metrics.csv` を出力
- 設定画面の履歴エクスポートボタンを新仕様に更新

### `src/features/settings/csv/history-csv.ts`

- `generateConditionsCsv` を `generateDailyWellnessCsv` へ置換（または同責務でリネーム）
- `generateDailyMetricsCsv` を追加
- 既存の `escapeCsvField` / `formatTimestampForCsv` を再利用して出力品質を揃える

### `src/features/i18n/messages/{ja,en}.ts`

- `settings_export_conditions` の文言を dailyWellness 前提に更新
- `daily-metrics` エクスポート用の新規ラベルキーを追加

---

## CSV Specification

### `daily-wellness.csv`

Header:

```csv
date,physicalScore,mentalScore,note,updatedAt
```

Rows:

- `dailyWellness` 1レコードにつき1行
- `updatedAt` は既存仕様どおり `formatTimestampForCsv` で整形

### `daily-metrics.csv`

Header:

```csv
date,metricType,value,unit,recordedAt
```

Rows:

- `dailyMetrics` 1レコードにつき1行
- `metricType` は `height|weight|bodyFat` をそのまま出力
- `recordedAt` は `formatTimestampForCsv` で整形

---

## Data Flow

1. ユーザーが設定画面で `daily-wellness` または `daily-metrics` エクスポートを実行
2. `DataManagement` が Dexie テーブルからデータ取得
3. `history-csv.ts` がCSV文字列を生成
4. 既存 `downloadCsv` でファイル保存

---

## Error Handling

- 既存エクスポートと同様に、データ取得失敗時は例外をそのまま表面化（黙殺しない）
- 空データ時もヘッダーのみCSVを出力し、ユーザー操作を失敗扱いにしない
- CSVエスケープ/日時整形は既存ユーティリティ再利用で一貫性を維持する

---

## Testing Strategy

### Unit Tests (`src/features/settings/csv/history-csv.test.ts`)

1. `generateDailyWellnessCsv` が正しいヘッダー順・日時整形を出力する
2. `generateDailyMetricsCsv` が `metricType/value/unit/recordedAt` を正しく出力する
3. 空タイムスタンプや空配列でも例外なくCSV文字列を生成できる

### Regression Scope

- `generateExerciseLogsCsv` の既存挙動を維持
- 設定画面でエクスポートボタン押下時の既存導線（ダウンロード動作）を維持

---

## Scope and Consistency Self-Check

- Placeholder/TODOなし
- `dailyWellness` と `dailyMetrics` の責務境界は明確
- 旧 `condition` 依存はエクスポート経路から除去
- 影響範囲は設定画面エクスポートとCSV生成に限定され、実装計画へ分解可能
