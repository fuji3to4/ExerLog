# Design: Self Care, Body Metrics, and History Graphs

**Date:** 2026-05-25  
**Status:** Approved

---

## Problem Statement

現在の ExerLog は、運動記録と3段階の体調記録を中心にした構成になっている。  
今回追加したいのは、運動に加えて次のような日次の自己管理を記録・振り返りできる体験である。

1. 身長・体重・体脂肪率などの数値記録
2. フィジカル / メンタルをそれぞれ5点満点で入力する体調記録
3. 運動とは別のセルフケア実施記録
4. それらの結果を履歴画面でグラフ化して確認できること

利用者の希望として、入力は運動画面に混ぜ込まず、**自己管理専用の新画面**を追加する。  
一方で振り返りは既存の履歴画面を拡張し、日別明細とグラフを同じ文脈で見られるようにする。

また、UI は **日本語版を基準** に設計し、下部メニューは **アイコン＋短いラベル** の構成を前提にする。

---

## Goals

- 自己管理専用の新タブ / 新画面を追加する
- 数値、主観評価、セルフケア実施内容を1日単位で保存できるようにする
- 将来、記録項目を増やしやすいデータ構造にする
- 履歴画面で日別明細と推移グラフの両方を閲覧できるようにする
- 既存の運動ログ、ライブラリ、設定機能を壊さずに拡張する

---

## Non-Goals

- クラウド同期
- データ共有
- AI による分析や自動アドバイス
- 任意のグラフレイアウト編集
- 初回実装時点での完全なカスタム項目 UI

初回では「基本項目を標準搭載しつつ、将来の追加に耐えられる構造」を優先する。

---

## Screen Structure

下部ナビゲーションは次の 5 タブ構成にする。

```text
今日 | ライブラリ | セルフケア | 履歴 | 設定
```

実装上は、各タブにアイコンと短い日本語ラベルを付ける。  
アイコンのみにはせず、5タブでも判別しやすいシンプルな構成を維持する。

### Today

- 既存の運動記録導線を維持する
- 「その日の運動を素早く記録する」役割を中心にする
- 既存の簡易体調入力は急に削除せず、Self Care 導入後も段階的に整理できる状態にする

### Self Care

新規画面を追加し、1日単位で以下を入力できるようにする。

1. フィジカル 1〜5
2. メンタル 1〜5
3. 数値記録（身長・体重・体脂肪率を標準表示）
4. セルフケア種目ごとの実施有無、回数、分数
5. 補足メモ

この画面が自己管理データの主入力導線になる。

### History

既存のカレンダーと日別明細に加えて、グラフ閲覧を追加する。  
表示は以下の 2 モードとする。

1. **日別詳細** — その日の運動 / 体調 / セルフケアを確認
2. **グラフ** — 指標ごとの推移を期間切替付きで確認

---

## Data Model

既存の `conditions` テーブルは 3 段階の体調とメモを保存する用途に最適化されている。  
今回の自己管理データは性質が異なるため、既存モデルに無理に押し込まず、新しい保存モデルを追加する。

### 1. `daily_wellness`

その日の主観評価と補足メモを保存する。

```text
date            string  primary key
physicalScore   number  1..5
mentalScore     number  1..5
note            string
updatedAt       string
```

### 2. `daily_metrics`

日付付きの数値記録を保存する。

```text
id              string  primary key
date            string
metricType      string
value           number
unit            string
recordedAt      string
```

初回の標準 `metricType` は次の 3 つとする。

- `height`
- `weight`
- `bodyFat`

この `metricType / value / unit` 方式により、将来的に `muscleMass` や `waist` などを追加しやすくする。

### 3. `self_care_catalog`

セルフケア種目のマスタを保存する。

```text
id              string  primary key
title           string
description     string
sortOrder       number
isArchived      boolean
```

初回はサンプル種目を持たせてもよいが、運動ライブラリと同様にユーザー管理へ拡張しやすい前提で作る。

### 4. `daily_self_care_logs`

その日のセルフケア実施内容を保存する。

```text
id              string  primary key
date            string
selfCareId      string
isDone          boolean
count           number | null
minutes         number | null
note            string
recordedAt      string
```

`isDone` が false の場合は `count` と `minutes` を null で保持できる。

---

## Input UX

Self Care 画面は、上から下へ自然に入力できる 1 画面構成にする。

1. **今日の体調**  
   フィジカル / メンタルをそれぞれ 1〜5 の入力 UI で記録する

2. **数値記録**  
   身長・体重・体脂肪率を標準項目として表示する  
   未入力の項目があっても保存は可能にする

3. **セルフケア記録**  
   種目一覧を並べ、各行で  
   - 実施チェック
   - 回数
   - 分数  
   を入力できるようにする

4. **メモ**  
   その日の補足を自由入力できるようにする

入力内容は「今日」を初期表示としつつ、既存の日付キー設計に合わせて任意日付の編集も可能にする。

---

## Graphs and History View

履歴画面ではグラフモードを追加し、「記録できるものはできるだけ全部グラフ化する」方針を採る。  
ただし、一度に全部を重ねて見せるのではなく、指標選択式にして読みやすさを保つ。

### Graph Types

| データ種別 | 表示方法 |
|---|---|
| 体重・体脂肪率・身長などの数値 | 折れ線グラフ |
| フィジカル / メンタル 1〜5 | 折れ線またはステップ線 |
| セルフケアの回数 / 分数 | 棒グラフ |
| セルフケアの実施有無 | 実施率表示または日別 ON/OFF 系表示 |

### Graph Controls

- 指標選択
- 期間切替: `7日 / 30日 / 90日 / 全期間`
- データ0件時の空状態表示

### History Day Detail Expansion

既存の日別詳細にも、必要に応じて次を表示する。

- その日のフィジカル / メンタル
- その日の数値記録一覧
- その日のセルフケア実施一覧

これにより、カレンダーで日を選んだときの詳細と、期間推移グラフの文脈が揃う。

---

## Architecture and Component Boundaries

実装は既存の feature 単位に沿って分割する。

```text
src/
├── app/
│   ├── self-care/
│   │   └── page.tsx
│   └── history/
│       └── page.tsx               # 履歴画面は既存拡張
├── features/
│   ├── self-care/
│   │   ├── components/
│   │   │   ├── self-care-screen.tsx
│   │   │   ├── wellness-card.tsx
│   │   │   ├── metrics-card.tsx
│   │   │   └── self-care-log-card.tsx
│   │   └── use-self-care-data.ts
│   ├── history/
│   │   ├── components/
│   │   │   ├── history-screen.tsx
│   │   │   └── history-graphs.tsx
│   │   └── history-query.ts       # 自己管理集計を拡張
│   ├── storage/
│   │   ├── app-db.ts
│   │   ├── daily-wellness.repository.ts
│   │   ├── daily-metrics.repository.ts
│   │   ├── self-care-catalog.repository.ts
│   │   └── daily-self-care.repository.ts
│   └── i18n/
│       └── messages/
│           ├── ja.ts
│           └── en.ts
└── components/
    └── app-shell/
        └── bottom-nav.tsx
```

### Key Decisions

- **入力画面と閲覧画面を分離**  
  Self Care は記録に集中し、History は振り返りに集中する

- **既存条件記録を即置換しない**  
  Today の `daily-condition` を急に消さず、互換性を壊さない段階導入にする

- **集計責務は History 側に寄せる**  
  グラフ表示用のデータ整形は `history-query.ts` または近接モジュールに持たせる

---

## Data Flow

1. Self Care 画面でその日の値を入力する
2. 各 repository が IndexedDB に保存する
3. History 画面で日別明細またはグラフ表示を開く
4. `history-query` が期間条件と指標条件に応じてデータを集計する
5. 画面は集計済みデータを表示する

運動ログは既存フローを維持し、自己管理データは新フローとして追加する。

---

## Error Handling

- 数値項目は未入力でも保存を許可する
- 数値形式が不正な場合のみ、その場で明示的にエラー表示する
- セルフケアで未実施の場合、回数 / 分数は必須にしない
- グラフ対象データが 0 件の場合は「まだ記録がありません」を表示する
- 不正な指標指定や欠損データでは黙って壊さず、表示可能な範囲のみ描画する

---

## Testing Strategy

以下を中心に既存テスト構成へ追加する。

1. **Repository テスト**
   - wellness 保存 / 取得
   - metric 保存 / 一覧取得
   - self-care ログ保存 / 取得

2. **UI テスト**
   - Self Care 画面で入力して保存できる
   - 数値未入力でも保存できる
   - 数値不正時は保存前にエラー表示される

3. **History 集計テスト**
   - 日別詳細に自己管理データが出る
   - 期間別グラフ用データが正しく集計される
   - データ0件時に空状態になる

4. **回帰テスト**
   - 既存の Today / Library / Settings / Exercise Log が壊れない

---

## Rollout Notes

- 文言追加は日本語を先に整え、その後で英語を追従する
- 下部メニューの 5 タブ化に合わせて、表示幅とアクセシビリティを確認する
- Self Care 導入後も、既存の condition データはそのまま読める状態を維持する

---

## Out of Scope for This Design

- 指標ごとの目標値設定
- 通知 / リマインダー
- CSV の自己管理データ入出力
- セルフケア結果からの自動レコメンド変更
- アイコンテーマや見た目の詳細デザイン検討
