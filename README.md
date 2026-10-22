# ExerLog

A local-first exercise & wellness tracking PWA. Log your daily condition, track wellness metrics, record self-care activities, and review history — all stored locally in your browser.

**[→ Open App](https://fuji3to4.github.io/ExerLog/)**

---

## Features

- **Today** — Log your daily wellness (physical/mental scores + notes), record recommended exercises, and complete self-care items in one place
- **Self-Care** — Track stretch, walking, bath, meditation and other self-care activities with counts, minutes, and notes
- **Library** — Browse, search, and filter the full exercise catalog with video links and details; dedicated exercise detail pages
- **History** — Review past days via calendar, view graphs (weight, body fat, wellness scores over time), edit or delete logged exercises and conditions
- **Settings / Data Management**
  - Add, edit, and delete custom exercises
  - Export exercises, exercise logs, conditions, wellness entries, and metrics as CSV
  - Import exercises from CSV
  - Bulk delete all exercises or all logs (two-step confirmation)
  - **Google Drive sync** — Sign in with Google and auto-sync all data to Google Sheets (30s debounce, works on every save)
  - **Theme switcher** — Choose between Warm, Cool, and Dark themes
- **i18n** — Japanese / English language toggle
- **PWA** — Install to home screen, works offline
- **PC Dashboard** — Responsive layout with sidebar navigation on desktop, bottom nav on mobile; today view and history dashboard side-by-side on larger screens

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| UI | React 19, shadcn/ui (Radix primitives), Tailwind CSS |
| Charts | Recharts (history graphs) |
| Storage | IndexedDB (Dexie.js) |
| Sync | Google Sheets API (OAuth 2.0) |
| PWA | next-pwa |
| Testing | Vitest + Testing Library |
| Deploy | GitHub Pages (GitHub Actions) |

## Design

The UI is inspired by the Mastercard design system — warm cream canvas, generous pill-shaped radii, and an editorial magazine feel. Sofia Sans serves as the primary typeface.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build & Test

```bash
npm run build   # outputs static files to out/
npm run test
```

## 体の数値の項目を足すには / Adding a body-measurement item

1. `src/features/measurements/measurement-items.ts` の `MEASUREMENT_ITEMS` に1件足す（`id`・`labelKey`・`unit`・`decimals`・`min`・`max`・`showInGraph`）。`id` は `id` / `date` / `recordedAt` / `note` / `updatedAt` と重ねない。
2. `src/features/i18n/messages/ja.ts` と `en.ts` に `labelKey` の表示名を足す。

入力欄・履歴・グラフ・CSV・スプレッドシートの列は、この2つだけで増えます。

1. Add one entry to `MEASUREMENT_ITEMS` in `src/features/measurements/measurement-items.ts` (`id`, `labelKey`, `unit`, `decimals`, `min`, `max`, `showInGraph`). The `id` must not collide with `id`, `date`, `recordedAt`, `note` or `updatedAt`.
2. Add the display name for its `labelKey` to `src/features/i18n/messages/ja.ts` and `en.ts`.

The input field, history, graph, CSV export and sheet column all follow from these two steps.

## Exercise Catalog Data

The built-in exercise catalog (`src/features/catalog/exercise-catalog.ts`) is generated at build time from `public/exercises.csv`, falling back to `src/features/catalog/exercise-catalog.default.ts` if the CSV is absent. Generation runs automatically via `predev`/`prebuild`/`pretest` (`scripts/generate-exercise-catalog.js`), so `exercise-catalog.ts` is gitignored and should never be hand-edited — changes go in `exercises.csv` instead.

## Data Privacy

All data is stored locally in the browser's IndexedDB. Google Drive sync is optional and opt-in — data is only sent to Google Sheets when you explicitly sign in and enable sync.

## License

[MIT](LICENSE)
