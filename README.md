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

## Exercise Catalog Data

The built-in exercise catalog (`src/features/catalog/exercise-catalog.ts`) is generated at build time from `public/exercises.csv`, falling back to `src/features/catalog/exercise-catalog.default.ts` if the CSV is absent. Generation runs automatically via `predev`/`prebuild`/`pretest` (`scripts/generate-exercise-catalog.js`), so `exercise-catalog.ts` is gitignored and should never be hand-edited — changes go in `exercises.csv` instead.

## Data Privacy

All data is stored locally in the browser's IndexedDB. Google Drive sync is optional and opt-in — data is only sent to Google Sheets when you explicitly sign in and enable sync.

## License

[MIT](LICENSE)
