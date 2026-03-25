# ExerLog

A simple exercise logging PWA. Track your daily condition and workout results with minimal friction.

**[→ Open App](https://fuji3to4.github.io/ExerLog/)**

---

## Features

- **Today** — Log your daily condition (mood + notes) and record recommended exercises in one tap
- **Library** — Browse, search, and filter the full exercise catalog with video links and details
- **History** — Review past days from a calendar, edit or delete logged exercises and conditions
- **Settings / Data Management**
  - Add, edit, and delete custom exercises
  - Export exercises, logs, and conditions as CSV
  - Import exercises from CSV
  - Bulk delete all exercises or all logs (two-step confirmation)
- **PWA** — Install to home screen, works offline
- **i18n** — Japanese / English language toggle

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| UI | React 19 |
| Storage | IndexedDB (Dexie.js) |
| PWA | next-pwa |
| Testing | Vitest + Testing Library |
| Deploy | GitHub Pages (GitHub Actions) |

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

## Data Privacy

All data is stored locally in the browser's IndexedDB. Nothing is sent to any server.

## License

[MIT](LICENSE)
