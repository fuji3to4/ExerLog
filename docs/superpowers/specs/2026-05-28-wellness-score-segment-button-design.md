# WellnessScore セグメントボタン入力 — デザイン仕様

**日付:** 2026-05-28  
**ステータス:** 承認済み

## 概要

スマートフォン操作を前提としたアプリにおいて、physicalScore / mentalScore の入力を `<input type="number">` からタップしやすい5段階セグメントボタンに変更する。5が良い・1が悪いことが一目でわかるヒントテキストを合わせて追加する。

## 背景・課題

- `<input type="number">` はスマホでタップターゲットが小さく、キーボードが開いてしまい操作性が悪い
- 1〜5の範囲が直感的でなく、どちらが良いか分からない

## 新コンポーネント: `WellnessScoreInput`

### ファイルパス

`src/features/self-care/components/wellness-score-input.tsx`

共有ユーティリティとして self-care feature 配下に置く（Today・History・Condition の3画面すべてで使用される）。

### Props

```tsx
type WellnessScoreInputProps = {
  id?: string;           // アクセシビリティ用（labelのhtmlFor対応）
  value: WellnessScore;  // 1 | 2 | 3 | 4 | 5
  onChange: (score: WellnessScore) => void;
}
```

### 外観・インタラクション

- ピル型コンテナ（背景 `#e8eef8`、border-radius: 999px）に1〜5のボタンを横並び
- 選択中ボタンは `#14213d`（アプリのプライマリカラー）で塗りつぶし、白テキスト
- 未選択ボタンは背景なし、`#4b5563` テキスト
- コンテナ下部に小さいヒントテキスト: 左端「😞 最悪」、右端「最高 😄」
- 既存パターン `.exercise-log-actions__button / .is-selected` と一貫したスタイル

### CSSクラス（globals.cssに追加）

```css
.wellness-score-input { /* ピル型コンテナ */ }
.wellness-score-input__button { /* 各ボタン */ }
.wellness-score-input__button.is-selected { /* 選択中 */ }
.wellness-score-input__hint { /* 最悪/最高テキスト */ }
```

## i18n キー追加

| キー | 日本語 | 英語 |
|------|--------|------|
| `wellness_score_hint_low` | `😞 最悪` | `😞 Worst` |
| `wellness_score_hint_high` | `最高 😄` | `Best 😄` |

## 適用箇所

| ファイル | 画面 | 対象 |
|---------|------|------|
| `src/features/today/components/daily-condition-card.tsx` | Today | physicalScore, mentalScore |
| `src/features/self-care/components/wellness-card.tsx` | Condition | physicalScore, mentalScore |
| `src/features/history/components/day-summary.tsx` (EditWellnessModal) | History編集モーダル | physicalScore, mentalScore |

各ファイルで `<input type="number" ...>` を `<WellnessScoreInput value={...} onChange={...} />` に置き換える。`toWellnessScore` ヘルパー関数は不要になるため削除する。

## スコープ外

- Metrics カード（身長・体重・体脂肪）: 連続値のため number input が適切。変更しない。
- Self-care ログカード（count・minutes）: 今回のスコープ外。別途検討。
- Settings の exercise form: 管理画面のため今回対象外。

## アクセシビリティ

- ボタングループは `role="group"` + `aria-label`（「身体スコア」「心のスコア」等）で囲む
- 各ボタンに `aria-pressed` でON/OFF状態を示す
