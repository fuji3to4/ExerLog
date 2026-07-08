# PC版レイアウト制約の設計

## 概要

PC版の全ページで、コンテンツが横に間延びする問題を解決する。main コンテナに最大幅を設定し、各ページで flex レイアウトを使用してカードを最適に配置する。

## 問題点

現在 `lg:max-w-none` で main コンテンツが全幅になり、カードが画面幅に応じて無制限に広がっている。

## 解決策

### 1. main コンテナの制約（app-shell.tsx）

```tsx
<main className="mx-auto w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4 lg:max-w-screen-xl lg:px-8 lg:pb-8">
```

これにより全ページでコンテンツ幅が 1280px で制限される。

### 2. 各ページの flex レイアウト

#### ダッシュボード (/) - page.tsx

```
flex container (gap-6, justify-center)
  ├── TodayScreen: max-w-[350px] (固定幅)
  └── HistoryDashboard: flex-1 (残りを使用)
```

#### 履歴 (/history) - history/page.tsx

```
flex container (gap-6, justify-center)
  ├── Calendar + Summary: max-w-[350px] (固定幅)
  └── HistoryGraphs: flex-1 (残りを使用)
```

#### ライブラリ (/library) - library-screen.tsx

```
flex-wrap container (gap-4)
  └── Exercise cards: max-w-[320px] 各カード
```

#### セルフケア (/self-care) - self-care-screen.tsx

```
flex container (gap-6, justify-center)
  ├── WellnessCard: max-w-[400px]
  └── MetricsCard: max-w-[400px]
```

#### 設定 (/settings) - settings-screen.tsx

```
flex container (gap-6, justify-center)
  └── 各設定セクション: max-w-[400px] (縦に積み上げ)
```

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| src/components/app-shell/app-shell.tsx | main の lg:max-w-none → lg:max-w-screen-xl |
| src/app/page.tsx | grid → flex、各カードに max-w |
| src/app/history/page.tsx | 同上 |
| src/features/library/components/library-screen.tsx | exercise cards に flex-wrap + max-w |
| src/features/self-care/components/self-care-screen.tsx | flex レイアウト追加 |
| src/features/settings/components/settings-screen.tsx | flex レイアウト追加 |

## レスポンシブ動作

| ブレークポイント | レイアウト | 説明 |
|------------------|-----------|------|
| < 1024px (モバイル) | 縦並び | 既存のままで変更なし |
| >= 1024px (PC) | flex横並び | 各カードに max-w を設定 |

## テスト

- 既存のテストに影響なし
- レイアウト変更のみのため、追加テスト不要

## 参考

- Tailwind CSS: max-w, flex, flex-wrap, min-w-0
- 現在のブレークポイント: lg (1024px)
