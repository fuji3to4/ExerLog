# ExerLog

A local-first exercise and wellness tracking PWA. Record how you feel, body measurements, exercise, and video watches throughout the day, then review them in your history.

**[→ Open App](https://fuji3to4.github.io/ExerLog/)**

---

## Features

- **Today** — Review a time-stamped daily timeline. Add and edit wellness records (physical and mental scores, notes), body measurements, exercise logs, and video-watch events.
- **Library** — Search and filter the exercise catalog by body area, purpose, duration, and intensity. Add, edit, and delete custom exercises in the library.
- **Exercise details** — View exercise information and videos, record a video watch, and log an exercise as completed or partially completed.
- **History** — Browse recorded days on a calendar, review and edit a day's timeline, and view graphs for wellness scores, body measurements, and BMI.
- **Settings and data** — Choose a Warm, Cool, or Dark theme; import and export the exercise library as CSV; export exercise logs, wellness records, video watches, and measurements as CSV files; or delete library and history data with confirmation.
- **Optional Google Sheets sync** — Sign in with Google to sync data to Google Sheets. Sync is scheduled after changes; local use does not require Google sign-in.
- **Japanese and English** — Switch the app language between Japanese and English.
- **Installable and offline-capable** — Install the PWA on a supported device and use locally stored data offline.
- **Responsive layout** — Desktop uses sidebar navigation and can show Today and History side by side; mobile uses bottom navigation.

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

Open `http://localhost:3000`.

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

1. Add an entry to `MEASUREMENT_ITEMS` in `src/features/measurements/measurement-items.ts` with `id`, `labelKey`, `unit`, `decimals`, `min`, `max`, and `showInGraph`. The `id` must not collide with `id`, `date`, `recordedAt`, `note`, or `updatedAt`.
2. Add the display name for `labelKey` to `src/features/i18n/messages/en.ts` and `ja.ts`.

The input field, history, graph, CSV export, and spreadsheet column follow from these changes.

## Exercise catalog data

The built-in catalog is generated from `public/exercises.csv` at build time. If that file is missing, the app uses `src/features/catalog/exercise-catalog.default.ts`. Generation runs automatically before development, build, and test commands. Do not edit the generated `src/features/catalog/exercise-catalog.ts` by hand; update `public/exercises.csv` instead.

## Data and privacy

App data is stored locally in your browser's IndexedDB. Google Sheets sync is optional: data is sent to Google only after you sign in and connect sync. Exported CSV files are downloaded to your device.

## License

[MIT](LICENSE)

---

## 日本語README

ExerLogは、運動とコンディションを記録するローカルファーストのPWAです。日々の体調、身体測定、運動、動画の視聴を記録し、履歴から振り返ることができます。

**[→ アプリを開く](https://fuji3to4.github.io/ExerLog/)**

## 主な機能

- **今日** — 時刻付きの1日のタイムラインを表示します。コンディション（身体・気分のスコア、メモ）、身体測定、運動、動画視聴の記録を追加・編集できます。
- **ライブラリ** — 運動カタログを検索し、部位・目的・時間・強度で絞り込めます。カスタム運動の追加・編集・削除ができます。
- **運動の詳細** — 運動の情報や動画を確認し、動画視聴を記録できます。運動の実施・一部実施も記録できます。
- **履歴** — カレンダーから記録日を選び、その日のタイムラインを確認・編集できます。コンディション、身体測定、BMIのグラフを表示します。
- **設定とデータ管理** — Warm・Cool・Darkのテーマを選べます。運動ライブラリのCSVインポート・エクスポート、運動・コンディション・動画視聴・身体測定データのCSVエクスポートができます。確認操作を経てライブラリや履歴データを削除できます。
- **Google Sheets同期（任意）** — Googleアカウントでサインインすると、Google Sheetsと同期できます。データ変更後に同期が予約されます。ローカルでの利用にGoogleサインインは不要です。
- **日本語・英語** — アプリの表示言語を日本語・英語で切り替えられます。
- **インストール・オフライン対応** — 対応端末にPWAをインストールでき、ローカルに保存したデータはオフラインでも利用できます。
- **レスポンシブレイアウト** — デスクトップではサイドバーを使い、TodayとHistoryを並べて表示できます。モバイルでは画面下部のナビゲーションを使います。

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

`http://localhost:3000` を開いてください。

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

1. `src/features/measurements/measurement-items.ts` の `MEASUREMENT_ITEMS` に、`id`・`labelKey`・`unit`・`decimals`・`min`・`max`・`showInGraph` を設定した項目を追加します。`id` は `id`・`date`・`recordedAt`・`note`・`updatedAt` と重複させないでください。
2. `src/features/i18n/messages/en.ts` と `ja.ts` に `labelKey` の表示名を追加します。

入力項目・履歴・グラフ・CSV・スプレッドシートの列は、これらの変更に連動します。

## 運動カタログデータ

組み込みカタログはビルド時に `public/exercises.csv` から生成されます。このファイルがない場合は `src/features/catalog/exercise-catalog.default.ts` が使われます。生成処理は開発・ビルド・テストの各コマンドの前に自動実行されます。生成物の `src/features/catalog/exercise-catalog.ts` は直接編集せず、`public/exercises.csv` を変更してください。

## データとプライバシー

アプリのデータはブラウザーのIndexedDBに保存されます。Google Sheets同期は任意です。サインインして同期を接続した場合にのみ、Googleへデータが送信されます。CSVエクスポートは端末にダウンロードされます。

## ライセンス

[MIT](LICENSE)
