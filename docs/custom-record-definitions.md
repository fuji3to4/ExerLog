あなたは、記録アプリ「ExerLog」に記録の種類を足すための「定義」を作ります。
下の決まりを守って、定義を JSON で1つ書いてください。

## 出力のしかた
- JSON だけを出力してください。説明文や前置きは付けないでください。
- コードブロック（```json）で囲んでかまいません。

## 形式の版
- `"exerlogRecordType": 1` を入れてください。省略しても1として読み込まれます。1以外の値は読み込めません。

## キーの一覧
- `exerlogRecordType`: 形式の版。数字の 1。省略できます。
- `id`: 記録の種類の ID。必須。半角の小文字・数字・ハイフンだけ。先頭は小文字か数字。40文字まで。
- `name`: 表示する名前。必須。空の文字列は不可。
- `icon`: 絵文字1つ。省略できます（省略すると 📝）。
- `color`: `#rrggbb` の形の色。省略できます。形が違うときは、ID から決まる色になります。
- `description`: ひとこと説明。省略できます。
- `fields`: 項目の配列。必須。1つ以上。

## 項目（fields の中身）
どの項目にも、次のキーがあります。
- `id`: 項目の ID。必須。半角英数字とアンダースコアだけ。先頭は英字。40文字まで。1つの定義の中で重複させない。
- `label`: 表示する名前。必須。空の文字列は不可。
- `type`: 項目の種類。必須。下の6つのどれか。
- `required`: 必ず入力させるなら true。省略すると false。

項目の種類と、種類ごとの設定:
- `number`: 数値。`unit`（単位）、`min`（最小）、`max`（最大）、`step`（刻み。0より大きい数）。すべて省略できます。`min` が `max` より大きいと読み込めません。
- `scale`: 段階から選ぶ。`levels`（段階の数。2〜10の整数。省略すると5）、`lowLabel`（低い側の名前）、`highLabel`（高い側の名前）。
- `choice`: 1つだけ選ぶ。`options` が必須（1つ以上）。
- `multiChoice`: 複数選ぶ。`options` が必須（1つ以上）。
- `boolean`: はい／いいえ。設定はありません。いつも「はい」か「いいえ」で保存されるので、`required` を付けても効果はありません。
- `text`: 自由な文字。設定はありません。

`options` の中身は `{ "id": "...", "label": "..." }` の配列です。
- 選択肢の `id`: 項目の ID と同じ決まり（半角英数字とアンダースコア、先頭は英字、40文字まで）。1つの項目の中で重複させない。
- 選択肢の `label`: 表示する名前。空の文字列は不可。

## 表示する文字の書き方
`name`、`description`、`label`、`lowLabel`、`highLabel`、選択肢の `label` は、次のどちらでも書けます。
- ふつうの文字列: `"プロテイン"`
- 言語ごとの文字列: `{ "ja": "プロテイン", "en": "Protein" }`（表示する言語のものがなければ、最初の値が使われます）

## ID の決まり
- 定義の `id`: 半角の小文字・数字・ハイフン。先頭は小文字か数字。40文字まで。
- 項目の `id`: 半角英数字とアンダースコア。先頭は英字。40文字まで。
- 使えない項目の ID: `id`、`date`、`recordedAt`、`note`、`updatedAt`。
- 記録には、時刻とメモが自動で付きます。時刻やメモの項目は作らないでください。

## あとから定義を変えるとき
- 項目の種類は変えられません（`choice` と `multiChoice` の入れ替えも変更です）。種類を変えたいときは、別の項目 ID にしてください。
- 項目や選択肢を減らすのはかまいません。消した項目の記録は残ります。
- 同じ `id` の定義を読み込むと、その定義が置き換わります。

## サンプル
```json
{
  "exerlogRecordType": 1,
  "id": "protein",
  "name": "プロテイン",
  "icon": "🥤",
  "color": "#5f9e7a",
  "description": "量・種類・タイミング",
  "fields": [
    {
      "id": "amount",
      "label": "量",
      "type": "number",
      "unit": "g",
      "min": 0,
      "max": 200,
      "step": 1,
      "required": true
    },
    {
      "id": "kind",
      "label": "種類",
      "type": "choice",
      "required": false,
      "options": [
        {
          "id": "whey",
          "label": "ホエイ"
        },
        {
          "id": "soy",
          "label": "ソイ"
        }
      ]
    },
    {
      "id": "timing",
      "label": "タイミング",
      "type": "multiChoice",
      "required": false,
      "options": [
        {
          "id": "wake",
          "label": "起床時"
        },
        {
          "id": "post",
          "label": "トレ後"
        }
      ]
    },
    {
      "id": "fasted",
      "label": "空腹時",
      "type": "boolean",
      "required": false
    },
    {
      "id": "brand",
      "label": "銘柄",
      "type": "text",
      "required": false
    },
    {
      "id": "taste",
      "label": "おいしさ",
      "type": "scale",
      "levels": 5,
      "lowLabel": "いまいち",
      "highLabel": "おいしい",
      "required": false
    }
  ]
}
```

## 作ってほしいもの
下の「記録したいもの」の内容に合う定義を、上の決まりどおりに JSON だけで出力してください。

記録したいもの:

---

## コードを読む AI のための補足

ここから下は、AI に渡す文章には含めません。リポジトリのコードを読む AI のための補足です。

- 保存先（ブラウザの Dexie）: 記録は `customRecords`、定義は `customRecordTypes` に入ります。
- Google スプレッドシート: 記録は `Custom_<定義ID>` のタブ、定義は `RecordTypes` のタブに入ります。
- 定義の検査は `src/features/modules/custom/definition.ts`（`parseDefinition`、`parseDefinitionText`）です。この文章は、その検査が受け付ける形に合わせてあります。
- この仕組みは、項目を並べて記録するだけの種類のためのものです。計算、画像、特別な画面が必要なときは、定義ではなく、`src/features/modules/<id>/` にコードのモジュールを書いてください。登録は `src/features/modules/registry.ts` です。
