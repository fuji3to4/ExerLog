# CSVからのエクササイズカタログ初期データ生成

## 背景・目的

`src/features/catalog/exercise-catalog.ts` は、アプリ初回起動時にIndexedDB (`exercise-catalog.repository.ts` の `seedIfEmpty()`) へ投入されるダミーのシードデータを、TypeScriptのハードコード配列として保持している。

このシードデータを、`public/exercises.csv` というCSVファイルから生成する仕組みに変更する。CSVはビルド時(および `npm run dev` 起動時)にのみ読み込まれ、実行時(ブラウザ)でCSVを読み込むことはしない。

IndexedDBは「一度シードされたら以降はそちらが常に優先される」という仕組みを既に持っており(`seedIfEmpty` はテーブルが空の場合のみ投入)、この設計は変更しない。今回の変更はあくまで「シード元データの生成方法」に限定される。

## アーキテクチャとファイル構成

- `src/features/catalog/exercise-catalog.ts`(既存)を `src/features/catalog/exercise-catalog.default.ts` にリネームする。中身は現状のダミーデータそのまま(`export const exerciseCatalog: ExerciseVideo[] = [...]`)。このファイルは引き続きgit管理する。
- `src/features/catalog/exercise-catalog.ts` は**ビルド生成物**として扱う。`.gitignore` に追加し、コミット対象から外す。
- `scripts/generate-exercise-catalog.js` を新規追加する。プレーンなNode CommonJSスクリプトとして書く(TypeScriptランタイムを追加で導入せず、CIのNode 20でもそのまま動かすため)。
- `papaparse` を devDependencies に追加し、CSVパースに使用する。

### npmスクリプト連動

`package.json` に以下を追加し、`npm run dev` / `npm run build` / `npm test` のたびに自動でカタログが再生成されるようにする(npmのpre-hook機構を利用):

```json
"predev": "node scripts/generate-exercise-catalog.js",
"prebuild": "node scripts/generate-exercise-catalog.js",
"pretest": "node scripts/generate-exercise-catalog.js"
```

## データフロー・生成ロジック

`scripts/generate-exercise-catalog.js` は起動時に `public/exercises.csv` の存在を確認し、2パターンに分岐する。

### CSVが存在する場合

1. `papaparse` で `header: true` を指定してパースする(ヘッダー名でマッピングするため列順は問わない)。
2. 各行を検証する:
   - `id`, `title`, `description`, `videoUrl`, `thumbnailUrl`, `bodyArea`, `purpose` が空文字でないこと
   - `intensity` が `"low" | "medium" | "high"` のいずれかであること
   - `durationMinutes` が正の数値に変換できること(`Number()` 変換後に検証)
   - `id` がファイル内で重複していないこと
3. 不正な行が1つでもあれば、検出した**すべてのエラーをまとめて**コンソールに出力し、`process.exit(1)` でビルド/dev起動自体を失敗させる。
4. 全行が正しければCSVの並び順のまま `ExerciseVideo[]` 形式のオブジェクト配列に変換する。
5. 以下の内容で `src/features/catalog/exercise-catalog.ts` を書き出す:

```ts
import type { ExerciseVideo } from "@/lib/types";

export const exerciseCatalog: ExerciseVideo[] = [
  // ...CSVから生成された各行(JSON.stringifyで出力)
];
```

### CSVが存在しない場合

バリデーションは行わず、以下の1行のみを `exercise-catalog.ts` として書き出す:

```ts
export { exerciseCatalog } from "./exercise-catalog.default";
```

### 既存のシード・優先順位ロジックへの影響

`exercise-catalog.repository.ts` の `seedIfEmpty()` は変更しない。IndexedDBが空のときだけ `exerciseCatalog`(CSV由来またはdefaultファイル由来)を投入し、以降はユーザーが個別に編集したIndexedDB側のデータが常に優先される。この挙動は今回の変更後も変わらない。

## テスト方針

- `src/features/catalog/catalog.test.ts` のimport元を `./exercise-catalog` から `./exercise-catalog.default` に変更する。アサーション内容(完全一致スナップショット)は現状のまま維持する。
- `scripts/generate-exercise-catalog.js` に対する単体テストを `scripts/generate-exercise-catalog.test.js` として新規追加する(vitestが自動検出する)。
  - 正常なCSV文字列 → 期待通りの `ExerciseVideo[]` に変換されることを検証
  - 不正な行(id重複、intensity不正、durationMinutes非数値、必須フィールド空)でエラーが集約されて検出されることを検証
  - テスト容易化のため、スクリプト内の「パース+検証」ロジックと「ファイルI/O(CSV読込・TS書き出し)」部分を分離し、ロジック部分を関数としてexportして直接テストする
- 他の既存テスト(`today-screen.test.tsx` など、`exerciseCatalog` やrepository経由でカタログを利用しているテスト)は、`pretest` フックによってカタログ生成が保証されるため影響を受けない想定。

## スコープ外

- CSVの編集UI、CSVアップロード機能などは対象外。CSVファイルは開発者が手動で `public/exercises.csv` に配置するのみ。
- 実行時(ブラウザ)でのCSV読み込みは行わない。
