# ExerLog

A local-first exercise and wellness tracking PWA. Record how you feel, body measurements, exercise, video watches and your own record types throughout the day, then review them in your history.

**[→ Open App](https://fuji3to4.github.io/ExerLog/)**

---

## Features

- **Today** — Review a time-stamped daily timeline, get recommended exercises, and log them with one tap. Add and edit records from **+ Add record**.
- **Record items** — Condition (physical and mental scores), Body (weight, body fat, height, BMI), Chest & waist, Arm & leg circumference, Photos, Self-care, Compression and Symptoms. Switch each on or off and reorder them in Settings. Self-care, Compression and Symptoms are tagged for lymphedema and start off unless the build enables them (see [Build-time defaults](#build-time-defaults)).
- **Library and my lists** — Search, filter, sort or shuffle the exercise catalog, and add, edit and delete your own exercises. Group videos into lists (a video can appear more than once) and reorder the library or a list by dragging.
- **Video player** — Watch an exercise video, log it as done or partly done, and play a list continuously with loop, shuffle and repeat-one. The screen stays on while playing.
- **History** — Browse recorded days on a calendar, review and edit a day's timeline, see each record item's graphs or summaries, and summarize any period across all items.
- **Settings and data** — Choose a Warm, Cool, or Dark theme; import and export the exercise library as CSV; export each kind of record as CSV; or delete library and history data with confirmation.
- **Custom record types** — Add your own record types (e.g. protein intake, meals, a workout) by importing a JSON definition, typically written by an AI. See [Custom record types](#custom-record-types).
- **Optional Google sync** — Sign in with Google to sync records to Google Sheets and photos to a Google Drive folder. Sync is scheduled after changes; local use does not require Google sign-in.
- **Japanese and English** — Switch the app language between Japanese and English.
- **Installable and offline-capable** — Install the PWA on a supported device and use locally stored data offline.
- **Responsive layout** — Desktop uses sidebar navigation and can show Today and History side by side; mobile uses bottom navigation.

## Custom record types

If ExerLog does not have a field for something you want to record, you can add a record type without touching the code.

1. In **Settings → Items to record**, tap **Copy guide for AI** and paste it into an AI such as ChatGPT or Claude. After the last line, `What I want to record:`, describe what you want to record (for example, "the time and amount of protein I drink").
2. Paste the JSON the AI returns into **+ Import definition** (or choose it as a file), check the preview, and import it. If it cannot be read, copy the errors and ask the AI to fix them.
3. The new type appears under **+ Add record**, and works like the built-in ones: timeline, history (graphs for numbers and scores, a list for the rest), period summary, CSV export, Google Sheets sync, and ON/OFF and ordering in Settings.

Notes:

- Fields can be numbers, 1–N scores, single choice, multiple choice, yes/no and short text. Every record also gets a time and a note. Calculations, photos, videos and custom screens are not supported.
- Definitions can be exported from the **⋯** menu and shared as files. Condition and Self-care can also be exported as templates to customize.
- Re-importing a definition with the same `id` updates it. Removed fields keep their data; changing a field's type is rejected (use a new field id).
- Deleting a definition hides it and keeps its records; it can be restored or deleted permanently from **Deleted definitions**.
- Definitions sync to the `RecordTypes` sheet tab, and each type's records to a `Custom_<id>` tab.
- The full format the importer accepts is in [docs/custom-record-definitions.md](docs/custom-record-definitions.md) (the same text as the in-app guide).

### Bigger changes: fork it

Custom record types cover "enter some values and keep them with a timestamp". For anything more — calculations, charts of your own, photos, new screens, or changes to how existing records work — please fork this repository and modify it for your own use. The code is MIT-licensed. Record types live in `src/features/modules/<id>/` and are registered in `src/features/modules/registry.ts`; an AI coding assistant can read these to add a module for you.

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| UI | React 19, shadcn/ui (Radix primitives), Tailwind CSS |
| Charts | Recharts |
| Local storage | IndexedDB (Dexie.js) |
| Optional sync | Google Sheets API, Google Drive API (OAuth 2.0) |
| PWA | next-pwa |
| Tests | Vitest, Testing Library |
| Deployment | GitHub Pages (GitHub Actions) |

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/ExerLog/` (the app is served under the `/ExerLog` base path).

## Build-time defaults

Record items tagged for one audience (currently `lymphedema`: Self-care, Compression and Symptoms) start off on a new device unless their tag is listed in `NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS`:

```bash
NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=lymphedema
```

The value is embedded at build time. A device saves its ON/OFF settings on first visit, so changing the value later does not affect a browser that has already opened the app. For GitHub Pages, set it as the repository variable `DEFAULT_ON_MODULE_TAGS`.

## Google Sync Setup

Google sync is optional. Without a client ID the app works locally, but Google sign-in is unavailable.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. Under **APIs & Services → Library**, enable **both** of these APIs:

   | API | Used for |
   |---|---|
   | Google Sheets API | Creating the "ExerLog Data" spreadsheet and reading/writing all records |
   | Google Drive API | Finding the spreadsheet, and the "ExerLog Photos" folder and photo files |

   If the Sheets API is disabled, sync fails with "Failed to create spreadsheet".
3. Configure the **OAuth consent screen**. The app requests the `drive.file` and `userinfo.email` scopes. While the app is in testing, add each Google account that will sign in as a test user.
4. Under **APIs & Services → Credentials**, create an **OAuth 2.0 Client ID** of type **Web application**, and add the authorized JavaScript origins (for example `http://localhost:3000` and `https://fuji3to4.github.io`). No redirect URI is needed.
5. Copy `.env.example` to `.env.local` and set the client ID:

   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

   Restart `npm run dev` after changing it. The value is embedded at build time.
6. For the GitHub Pages deployment, add the same value as the repository secret `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (used by `.github/workflows/deploy.yml`).

## Build and Test

```bash
npm run build
npm run test
```

## Add a body-measurement item

1. Add an entry to `BODY_ITEMS` (Body) or `GIRTH_ITEMS` (Chest & waist) in `src/features/measurements/measurement-items.ts` with `id`, `labelKey`, `unit`, `decimals`, `min`, `max`, and `showInGraph`. The `id` must not collide with `id`, `date`, `recordedAt`, `note`, or `updatedAt`.
2. Add the display name for `labelKey` to `src/features/i18n/messages/en.ts` and `ja.ts`.

The input field, history, graph, CSV export, and spreadsheet column follow from these changes.

## Exercise catalog data

The built-in catalog is generated from `public/exercises.csv` at build time. If that file is missing, the app uses `src/features/catalog/exercise-catalog.default.ts`. Generation runs automatically before development, build, and test commands. Do not edit the generated `src/features/catalog/exercise-catalog.ts` by hand; update `public/exercises.csv` instead.

## Data and privacy

App data is stored locally in your browser's IndexedDB. Google sync is optional: data is sent to Google only after you sign in and connect sync. Photos are uploaded to Google Drive only while photo sync is on. Exported CSV files are downloaded to your device.

## License

[MIT](LICENSE)

---

## 日本語README

ExerLogは、運動とコンディションを記録するローカルファーストのPWAです。日々の体調、身体測定、運動、動画の視聴、自分で足した記録を残し、履歴から振り返ることができます。

**[→ アプリを開く](https://fuji3to4.github.io/ExerLog/)**

## 主な機能

- **今日** — 時刻付きの1日のタイムラインと今日のおすすめ運動を表示し、ワンタップで記録できます。「＋ 記録する」から各記録を追加・編集できます。
- **記録する項目** — 体調（からだ・こころのスコア）、身体（体重・体脂肪・身長・BMI）、胸囲・腹囲、腕・脚周径、写真、セルフケア、着用、症状。設定で項目ごとに ON/OFF と並べ替えができます。セルフケア・着用・症状はリンパ浮腫向けのタグ付きで、ビルドで有効にしない限り最初は OFF です（[ビルド時の初期設定](#ビルド時の初期設定)を参照）。
- **ライブラリとマイリスト** — 運動カタログを検索・絞り込み・並べ替え・シャッフルでき、自分の運動の追加・編集・削除もできます。動画をリストにまとめられ（同じ動画を複数回入れることも可能）、ライブラリやリストの順番はドラッグで変えられます。
- **動画プレイヤー** — 運動の動画を見て「できた」「一部できた」を記録できます。リストの連続再生、ループ、シャッフル、1本リピートができ、再生中は画面が消えません。
- **履歴** — カレンダーから記録日を選び、その日のタイムラインを確認・編集できます。記録する項目ごとのグラフやまとめ、項目をまたいだ期間のまとめを表示します。
- **設定とデータ管理** — Warm・Cool・Darkのテーマを選べます。運動ライブラリのCSVインポート・エクスポート、各記録のCSVエクスポートができます。確認操作を経てライブラリや履歴データを削除できます。
- **カスタム記録** — プロテイン・食事・筋トレなど、自分が記録したいものを JSON の定義を読み込んで足せます（定義は AI に作ってもらう想定）。[カスタム記録](#カスタム記録)を参照してください。
- **Google同期（任意）** — Googleアカウントでサインインすると、記録をGoogle Sheetsに、写真をGoogleドライブのフォルダに同期できます。データ変更後に同期が予約されます。ローカルでの利用にGoogleサインインは不要です。
- **日本語・英語** — アプリの表示言語を日本語・英語で切り替えられます。
- **インストール・オフライン対応** — 対応端末にPWAをインストールでき、ローカルに保存したデータはオフラインでも利用できます。
- **レスポンシブレイアウト** — デスクトップではサイドバーを使い、TodayとHistoryを並べて表示できます。モバイルでは画面下部のナビゲーションを使います。

## カスタム記録

ExerLog に記録したい項目がないときは、コードを変えずに記録の種類を足せます。

1. **設定 → 記録する項目** で「**AI に渡す説明をコピー**」を押し、ChatGPT や Claude などの AI に貼り付けます。最後の「`記録したいもの:`」のあとに、記録したいことを書きます（例：「プロテインを飲んだ時刻と量」）。
2. AI が返した JSON を「**＋ 定義を読み込む**」に貼り付けるか、ファイルで選びます。確認画面で中身を見てから読み込みます。読めないときは、エラーをコピーして AI に直してもらってください。
3. 「**＋ 記録する**」に新しい種類が出ます。タイムライン、履歴（数値とスコアはグラフ、ほかは一覧）、期間のまとめ、CSV 書き出し、Google Sheets 同期、設定での ON/OFF と並べ替えも、既存の記録と同じように使えます。

補足:

- 使える項目は、数値・段階スコア・1つ選ぶ・いくつでも選ぶ・はい／いいえ・短いテキストです。どの記録にも日時とメモが付きます。計算、写真、動画、専用の画面は使えません。
- 定義は「**⋯**」から書き出して、ファイルでほかの人に渡せます。体調とセルフケアも、ひな形として書き出して作り変えられます。
- 同じ `id` の定義を読み込み直すと更新になります。消した項目のデータは残ります。項目の種類を変えることはできません（別の項目 ID にしてください）。
- 定義を削除すると画面から消えますが、記録は残ります。「**削除した定義**」から元に戻すことも、完全に削除することもできます。
- 定義はスプレッドシートの `RecordTypes` タブに、各種類の記録は `Custom_<id>` タブに同期されます。
- 読み込める形式の詳細は [docs/custom-record-definitions.md](docs/custom-record-definitions.md) にあります（アプリの「AI に渡す説明」と同じ内容です）。

### それ以上の改造は fork してください

カスタム記録でできるのは「値を入力して、日時付きで残す」ところまでです。計算、独自のグラフ、写真、新しい画面、既存の記録の動きの変更などが必要な場合は、このリポジトリを fork して、自分用に改造して使ってください（MIT ライセンスです）。記録の種類は `src/features/modules/<id>/` にあり、`src/features/modules/registry.ts` に登録されています。AI コーディングアシスタントにこれらを読ませれば、モジュールを足してもらえます。

## 技術スタック

| | |
|---|---|
| フレームワーク | Next.js 15 (App Router、静的エクスポート) |
| UI | React 19、shadcn/ui (Radix primitives)、Tailwind CSS |
| グラフ | Recharts |
| ローカルストレージ | IndexedDB (Dexie.js) |
| 任意の同期 | Google Sheets API、Google Drive API (OAuth 2.0) |
| PWA | next-pwa |
| テスト | Vitest、Testing Library |
| デプロイ | GitHub Pages (GitHub Actions) |

## ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000/ExerLog/` を開いてください（アプリは `/ExerLog` 以下で配信されます）。

## ビルド時の初期設定

特定の利用者向けのタグが付いた記録項目（現在は `lymphedema`：セルフケア・着用・症状）は、`NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS` にそのタグを入れない限り、新しい端末では OFF で始まります。

```bash
NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=lymphedema
```

値はビルド時に埋め込まれます。端末は最初に開いたときの ON/OFF を保存するため、あとから値を変えても、すでにアプリを開いたブラウザーには反映されません。GitHub Pages では、リポジトリ変数 `DEFAULT_ON_MODULE_TAGS` に設定します。

## Google同期の設定

Google同期は任意です。クライアントIDを設定しなくてもアプリはローカルで動作しますが、Googleサインインは使えません。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成または選択します。
2. **APIとサービス → ライブラリ** で、次の2つの API を**両方**有効にします。

   | API | 用途 |
   |---|---|
   | Google Sheets API | 「ExerLog Data」スプレッドシートの作成、全データの読み書き |
   | Google Drive API | スプレッドシートの検索、「ExerLog Photos」フォルダと写真ファイル |

   Sheets API が無効だと、同期時に「Failed to create spreadsheet」になります。
3. **OAuth 同意画面**を設定します。アプリが要求するスコープは `drive.file` と `userinfo.email` です。テスト中の場合は、サインインする Google アカウントをテストユーザーに追加してください。
4. **APIとサービス → 認証情報** で、種類「**ウェブ アプリケーション**」の **OAuth 2.0 クライアント ID** を作成し、承認済みの JavaScript 生成元（例: `http://localhost:3000`、`https://fuji3to4.github.io`）を追加します。リダイレクト URI は不要です。
5. `.env.example` を `.env.local` にコピーし、クライアントIDを設定します。

   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

   値はビルド時に埋め込まれるため、変更後は `npm run dev` を再起動してください。
6. GitHub Pages へのデプロイでは、同じ値をリポジトリのシークレット `NEXT_PUBLIC_GOOGLE_CLIENT_ID` に登録します（`.github/workflows/deploy.yml` で使用）。

## ビルドとテスト

```bash
npm run build
npm run test
```

## 身体測定項目を追加する

1. `src/features/measurements/measurement-items.ts` の `BODY_ITEMS`（身体）または `GIRTH_ITEMS`（胸囲・腹囲）に、`id`・`labelKey`・`unit`・`decimals`・`min`・`max`・`showInGraph` を設定した項目を追加します。`id` は `id`・`date`・`recordedAt`・`note`・`updatedAt` と重複させないでください。
2. `src/features/i18n/messages/en.ts` と `ja.ts` に `labelKey` の表示名を追加します。

入力項目・履歴・グラフ・CSV・スプレッドシートの列は、これらの変更に連動します。

## 運動カタログデータ

組み込みカタログはビルド時に `public/exercises.csv` から生成されます。このファイルがない場合は `src/features/catalog/exercise-catalog.default.ts` が使われます。生成処理は開発・ビルド・テストの各コマンドの前に自動実行されます。生成物の `src/features/catalog/exercise-catalog.ts` は直接編集せず、`public/exercises.csv` を変更してください。

## データとプライバシー

アプリのデータはブラウザーのIndexedDBに保存されます。Google同期は任意です。サインインして同期を接続した場合にのみ、Googleへデータが送信されます。写真は、写真の同期がONのときだけGoogleドライブにアップロードされます。CSVエクスポートは端末にダウンロードされます。

## ライセンス

[MIT](LICENSE)
