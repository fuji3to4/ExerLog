# Exercise Log MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Next.js PWA that helps users watch curated exercise videos, log daily exercise completion, record one simple condition entry per day, and review activity in a calendar-based history view.

**Architecture:** Build a static-first Next.js App Router app with client-side state for interactive screens and IndexedDB persistence through Dexie. Keep the code organized by feature (`catalog`, `today`, `logging`, `history`, `storage`) so each route composes focused components and repositories rather than placing all logic in pages.

**Tech Stack:** Next.js App Router, TypeScript, React, Dexie (IndexedDB), Vitest, React Testing Library, fake-indexeddb, next-pwa, ESLint

---

## File Structure

### App and configuration

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `eslint.config.mjs`
- Create: `public\manifest.webmanifest`
- Create: `src\app\layout.tsx`
- Create: `src\app\globals.css`
- Create: `src\app\page.tsx`
- Create: `src\app\library\page.tsx`
- Create: `src\app\history\page.tsx`
- Create: `src\app\exercises\[exerciseId]\page.tsx`
- Create: `src\app\exercises\[exerciseId]\page.test.tsx`
- Create: `src\app\icon.svg`
- Create: `src\app\page.test.tsx`

### Shared domain and helpers

- Create: `src\lib\types.ts`
- Create: `src\lib\date\day-key.ts`
- Create: `src\lib\date\day-key.test.ts`
- Create: `src\lib\date\month-grid.ts`

### Bundled exercise catalog and recommendation logic

- Create: `src\features\catalog\exercise-catalog.ts`
- Create: `src\features\catalog\catalog.test.ts`
- Create: `src\features\recommendations\get-todays-recommendations.ts`
- Create: `src\features\recommendations\get-todays-recommendations.test.ts`

### Local persistence

- Create: `src\features\storage\app-db.ts`
- Create: `src\features\storage\exercise-logs.repository.ts`
- Create: `src\features\storage\daily-condition.repository.ts`
- Create: `src\features\storage\storage.test.ts`

### Shared logging UI

- Create: `src\features\logging\components\exercise-log-actions.tsx`
- Create: `src\features\logging\exercise-log-actions.test.tsx`

### Today flow

- Create: `src\features\today\components\daily-condition-card.tsx`
- Create: `src\features\today\components\recommended-exercise-card.tsx`
- Create: `src\features\today\components\today-screen.tsx`
- Create: `src\features\today\use-today-data.ts`
- Create: `src\features\today\today-screen.test.tsx`

### Library flow

- Create: `src\features\library\components\library-filters.tsx`
- Create: `src\features\library\components\library-screen.tsx`
- Create: `src\features\library\components\exercise-detail-screen.tsx`
- Create: `src\features\library\library-screen.test.tsx`

### History flow

- Create: `src\features\history\history-query.ts`
- Create: `src\features\history\components\history-calendar.tsx`
- Create: `src\features\history\components\day-summary.tsx`
- Create: `src\features\history\components\history-screen.tsx`
- Create: `src\features\history\history-screen.test.tsx`

### Shared UI shell

- Create: `src\components\app-shell\bottom-nav.tsx`
- Create: `src\components\app-shell\bottom-nav.test.tsx`

## Chunk 1: Foundation and domain setup

### Task 1: Bootstrap the Next.js static-first app shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src\app\layout.tsx`
- Create: `src\app\globals.css`
- Create: `src\app\page.tsx`
- Create: `src\app\library\page.tsx`
- Create: `src\app\history\page.tsx`
- Create: `src\components\app-shell\bottom-nav.tsx`
- Create: `src\components\app-shell\bottom-nav.test.tsx`
- Create: `src\app\page.test.tsx`

- [ ] **Step 1: Write the failing app-shell test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("renders the primary navigation labels", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { BottomNav } from "./bottom-nav";

test("marks the current destination as active", () => {
  render(<BottomNav currentPath="/library" />);

  expect(screen.getByRole("link", { name: /library/i })).toHaveAttribute("aria-current", "page");
});
```

```ts
import { toDayKey } from "@/lib/date/day-key";

test("formats local dates as YYYY-MM-DD day keys", () => {
  expect(toDayKey(new Date(2026, 2, 23))).toBe("2026-03-23");
});
```

- [ ] **Step 2: Run the test command to confirm the repo is not wired yet**

Run: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx`
Expected: FAIL because `package.json` and test scripts do not exist yet in the blank repo

- [ ] **Step 3: Scaffold the app and testing scripts**

Create a minimal `package.json` with these scripts:

```json
{
  "dependencies": {
    "dexie": "4.0.10",
    "next": "15.2.4",
    "next-pwa": "5.6.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.2.0",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "22.13.10",
    "@types/react": "19.0.10",
    "@types/react-dom": "19.0.4",
    "eslint": "9.22.0",
    "eslint-config-next": "15.2.4",
    "fake-indexeddb": "6.0.0",
    "jsdom": "26.0.0",
    "typescript": "5.8.2",
    "vitest": "3.0.8"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
}
```

Set `next.config.ts` to static-first output and PWA-safe settings:

```ts
const nextConfig = {
  output: "export",
  reactStrictMode: true,
};

export default nextConfig;
```

`next-pwa` is installed in this chunk but is intentionally configured later in **Chunk 3, Task 7**.

- [ ] **Step 4: Install dependencies and add baseline config files**

Run: `npm install`
Expected: `package-lock.json` created and install completes without errors

Create baseline config files:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom";
```

```ts
// next-env.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

```js
// eslint.config.mjs
import nextVitals from "eslint-config-next/core-web-vitals";

export default [...nextVitals];
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 5: Re-run the focused tests to verify failures now come from missing app code**

Run: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx`
Expected: FAIL because the route files and navigation component are still not implemented

- [ ] **Step 6: Add global styles and the shared shell layout**

Give `src\app\globals.css` responsibility for:
- mobile-first spacing
- large tap targets
- simple card layout
- sticky bottom navigation spacing
- `.app-shell` container width and padding
- `.bottom-nav` mobile navigation treatment
- `.card` and `.button-row` utility classes for feature panels

- [ ] **Step 7: Implement the minimal routed app shell**

Create `layout.tsx`, `page.tsx`, `library/page.tsx`, `history/page.tsx`, and `bottom-nav.tsx` so the app renders three primary destinations with a simple mobile-first shell.

Boundary rules:
- `page.tsx`, `library/page.tsx`, and `history/page.tsx` stay thin route entry points
- shared navigation/layout responsibility stays in `layout.tsx` and `bottom-nav.tsx`
- feature logic belongs in feature components and hooks, not in route files
- because the app uses `output: "export"`, **Task 5 in Chunk 3** must own `generateStaticParams` for `src\app\exercises\[exerciseId]\page.tsx`

Exact route outcomes:
- `page.tsx` renders a `Today` heading
- `library/page.tsx` renders a `Library` heading
- `history/page.tsx` renders a `History` heading
- `bottom-nav.tsx` renders links for all three destinations

- [ ] **Step 8: Run the focused test, then lint**

Run: `npm run test -- src\app\page.test.tsx src\components\app-shell\bottom-nav.test.tsx && npm run lint && npm run build && Test-Path out\index.html && Test-Path out\library\index.html && Test-Path out\history\index.html`
Expected:
- focused tests PASS
- lint passes
- build passes
- `Test-Path` returns `True` for `out\index.html`, `out\library\index.html`, and `out\history\index.html`

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts src
git commit -m "feat: scaffold exercise log app shell" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Add the domain model, bundled catalog, and recommendation rules

**Files:**
- Create: `src\lib\types.ts`
- Create: `src\lib\date\day-key.ts`
- Create: `src\lib\date\day-key.test.ts`
- Create: `src\features\catalog\exercise-catalog.ts`
- Create: `src\features\catalog\catalog.test.ts`
- Create: `src\features\recommendations\get-todays-recommendations.ts`
- Create: `src\features\recommendations\get-todays-recommendations.test.ts`

- [ ] **Step 1: Write the failing catalog and recommendation tests**

```ts
import { exerciseCatalog } from "./exercise-catalog";

test("catalog contains enough metadata for browsing and logging", () => {
  expect(exerciseCatalog).toHaveLength(6);
  expect(exerciseCatalog[0]).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    description: expect.any(String),
    videoUrl: expect.any(String),
    thumbnailUrl: expect.any(String),
    bodyArea: expect.any(String),
    purpose: expect.any(String),
    durationMinutes: expect.any(Number),
    intensity: expect.any(String),
  });
});
```

```ts
import { getTodaysRecommendations } from "./get-todays-recommendations";
import { exerciseCatalog } from "../catalog/exercise-catalog";

test("returns lower intensity items when the user feels tired", () => {
  const recommendations = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "tired",
    date: "2026-03-23",
  });

  expect(recommendations.every((item) => item.intensity !== "high")).toBe(true);
});
```

```ts
test("returns a stable set of at most three recommendations for one day", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result).toHaveLength(3);
  expect(result).toEqual(
    getTodaysRecommendations({
      catalog: exerciseCatalog,
      conditionLevel: "okay",
      date: "2026-03-23",
    }),
  );
});
```

```ts
test("returns the same known recommendation order for a known day", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result.map((item) => item.id)).toEqual([
    "neck-mobility-5",
    "breathing-reset-3",
    "walk-in-place-10",
  ]);
});
```

```ts
test("catalog covers the planned browsing dimensions", () => {
  expect(new Set(exerciseCatalog.map((item) => item.bodyArea)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.purpose)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.intensity)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.durationMinutes)).size).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm run test -- src\features\catalog\catalog.test.ts src\features\recommendations\get-todays-recommendations.test.ts src\lib\date\day-key.test.ts`
Expected: FAIL because the catalog, recommendation, and day-key modules do not exist

- [ ] **Step 3: Create the shared types and bundled exercise data**

Define `ExerciseVideo`, `ExerciseLog`, `DailyConditionEntry`, `ExerciseLogResult`, and `ConditionLevel` in `src\lib\types.ts`.

Minimum fields to include:
- `ExerciseVideo`: `id`, `title`, `description`, `videoUrl`, `thumbnailUrl`, `bodyArea`, `purpose`, `durationMinutes`, `intensity`
- `ExerciseLog`: `id`, `date`, `exerciseId`, `result`, `loggedAt`
- `DailyConditionEntry`: `date`, `conditionLevel`, `note`, `updatedAt`

Pin the value unions to the product contract:
- `ConditionLevel = "good" | "okay" | "tired"`
- `ExerciseLogResult = "did" | "partial" | "could_not"`

Seed `exercise-catalog.ts` with a minimum curated array of **6 exercises** covering:
- at least 2 body areas
- at least 2 purposes
- low, medium, and at least 1 high-intensity option
- short and moderate durations

For MVP planning, `thumbnailUrl` can remain a data field only; the initial UI must not depend on local thumbnail image files existing.

Use concrete entries including:

```ts
export const exerciseCatalog: ExerciseVideo[] = [
  {
    id: "neck-mobility-5",
    title: "Neck Mobility",
    description: "Gentle seated mobility work for the neck and shoulders.",
    videoUrl: "https://www.youtube.com/watch?v=example1",
    thumbnailUrl: "/thumbnails/neck-mobility.jpg",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  },
  {
    id: "breathing-reset-3",
    title: "Breathing Reset",
    description: "A short calming reset for days with lower energy.",
    videoUrl: "https://www.youtube.com/watch?v=example2",
    thumbnailUrl: "/thumbnails/breathing-reset.jpg",
    bodyArea: "full-body",
    purpose: "recovery",
    durationMinutes: 3,
    intensity: "low",
  },
  {
    id: "walk-in-place-10",
    title: "Walk in Place",
    description: "A simple standing exercise for light activity.",
    videoUrl: "https://www.youtube.com/watch?v=example3",
    thumbnailUrl: "/thumbnails/walk-in-place.jpg",
    bodyArea: "full-body",
    purpose: "endurance",
    durationMinutes: 10,
    intensity: "medium",
  },
  {
    id: "shoulder-roll-4",
    title: "Shoulder Rolls",
    description: "A light upper-body warm-up to ease shoulder stiffness.",
    videoUrl: "https://www.youtube.com/watch?v=example4",
    thumbnailUrl: "/thumbnails/shoulder-roll.jpg",
    bodyArea: "upper-body",
    purpose: "warmup",
    durationMinutes: 4,
    intensity: "low",
  },
  {
    id: "hip-mobility-6",
    title: "Hip Mobility",
    description: "Gentle standing mobility for hips and lower body comfort.",
    videoUrl: "https://www.youtube.com/watch?v=example5",
    thumbnailUrl: "/thumbnails/hip-mobility.jpg",
    bodyArea: "lower-body",
    purpose: "mobility",
    durationMinutes: 6,
    intensity: "medium",
  },
  {
    id: "seated-calf-raise-5",
    title: "Seated Calf Raise",
    description: "A simple seated movement for light lower-body activation.",
    videoUrl: "https://www.youtube.com/watch?v=example6",
    thumbnailUrl: "/thumbnails/seated-calf-raise.jpg",
    bodyArea: "lower-body",
    purpose: "strength",
    durationMinutes: 5,
    intensity: "high",
  },
];
```

- [ ] **Step 4: Add day-key utilities**

Create `src\lib\date\day-key.ts` and `src\lib\date\day-key.test.ts` with a local-calendar helper used everywhere daily data is keyed:

```ts
export function toDayKey(date: Date | string): string {
  if (typeof date === "string") return date;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
```

Add one focused test that proves the same local date always resolves to the same `YYYY-MM-DD` key.

- [ ] **Step 5: Implement deterministic recommendation rules**

Use a small pure function that:
- filters out high-intensity items when `conditionLevel === "tired"`
- rotates recommendations by date
- returns 3 items max

- [ ] **Step 6: Run the tests**

Run: `npm run test -- src\features\catalog\catalog.test.ts src\features\recommendations\get-todays-recommendations.test.ts src\lib\date\day-key.test.ts && npm run lint && npm run build`
Expected:
- all tests PASS
- recommendation tests prove a fixed 3-item result for `2026-03-23`
- lint passes
- build passes

- [ ] **Step 7: Commit**

```bash
git add src\lib src\features\catalog src\features\recommendations
git commit -m "feat: add bundled catalog and recommendation rules" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Chunk 2: Local persistence and Today flow

### Task 3: Implement IndexedDB persistence with focused repositories

**Files:**
- Create: `src\features\storage\app-db.ts`
- Create: `src\features\storage\exercise-logs.repository.ts`
- Create: `src\features\storage\daily-condition.repository.ts`
- Modify: `vitest.setup.ts`
- Create: `src\features\storage\storage.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
test("upserts one daily condition per day", async () => {
  await saveDailyCondition({ date: "2026-03-23", conditionLevel: "okay", note: "" });
  await saveDailyCondition({ date: "2026-03-23", conditionLevel: "tired", note: "legs feel heavy" });

  const entry = await getDailyCondition("2026-03-23");
  expect(entry?.conditionLevel).toBe("tired");
  expect(entry?.note).toBe("legs feel heavy");
});
```

```ts
test("stores one log result per exercise and day", async () => {
  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "partial",
  });

  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "did",
  });

  const logs = await listExerciseLogsForDay("2026-03-23");
  expect(logs).toHaveLength(1);
  expect(logs[0]?.result).toBe("did");
});
```

- [ ] **Step 2: Run the storage tests to verify they fail**

Run: `npm run test -- src\features\storage\storage.test.ts`
Expected: FAIL because Dexie tables and repositories do not exist

- [ ] **Step 3: Implement the Dexie schema**

Use one Dexie database with two tables:

```ts
logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]"
conditions: "date, conditionLevel, note, updatedAt"
```

- [ ] **Step 4: Implement repository helpers**

Keep repository responsibilities narrow:
- `exercise-logs.repository.ts` only handles exercise log CRUD/query helpers
- `daily-condition.repository.ts` only handles condition read/write helpers

`saveExerciseLog` must use `date + exerciseId` uniqueness semantics so repeated clicks replace the existing row instead of creating duplicates.

- [ ] **Step 5: Add test setup for IndexedDB**

Use `fake-indexeddb` in `vitest.setup.ts` so repository tests run in Node. The dependency is installed in Task 1.

- [ ] **Step 6: Run the storage tests**

Run: `npm run test -- src\features\storage\storage.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add vitest.setup.ts src\features\storage
git commit -m "feat: add local persistence repositories" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Build the Today screen with daily condition and one-tap logging

**Files:**
- Create: `src\features\logging\components\exercise-log-actions.tsx`
- Create: `src\features\logging\exercise-log-actions.test.tsx`
- Create: `src\features\today\components\daily-condition-card.tsx`
- Create: `src\features\today\components\recommended-exercise-card.tsx`
- Create: `src\features\today\components\today-screen.tsx`
- Create: `src\features\today\use-today-data.ts`
- Modify: `src\app\page.tsx`
- Modify: `src\app\page.test.tsx`
- Create: `src\features\today\today-screen.test.tsx`

- [ ] **Step 1: Write the failing Today screen tests**

```tsx
test("lets the user save a daily condition and log an exercise from the home screen", async () => {
  render(<TodayScreen date="2026-03-23" />);

  expect(screen.getByRole("heading", { name: /march 23, 2026/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /okay/i }));
  await user.click(screen.getByRole("button", { name: /save condition/i }));
  await user.click(screen.getByRole("button", { name: /did it/i, exact: false }));

  expect(await screen.findByText(/condition saved/i)).toBeInTheDocument();
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("hydrates existing condition note and existing log state on first render", async () => {
  await seedTodayState();
  render(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByDisplayValue(/legs feel heavy/i)).toBeInTheDocument();
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("keeps the recommended list short and stable for the selected day", async () => {
  render(<TodayScreen date="2026-03-23" />);

  const cards = await screen.findAllByRole("article");
  expect(cards).toHaveLength(3);
  expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
    "Neck Mobility",
    "Breathing Reset",
    "Walk in Place",
  ]);
});
```

```tsx
test("lets the user edit an existing daily condition and updates recommendations", async () => {
  await seedTodayState();
  render(<TodayScreen date="2026-03-23" />);

  await user.click(screen.getByRole("button", { name: /tired/i }));
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  expect(await screen.findByText(/condition saved/i)).toBeInTheDocument();
  expect(await screen.findByText(/low intensity/i)).toBeInTheDocument();
});
```

```tsx
test("shared logging actions expose the three outcome buttons and current saved state", () => {
  render(<ExerciseLogActions currentResult="did" onLog={vi.fn()} />);

  expect(screen.getByRole("button", { name: /did it/i, exact: false })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /partly/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /couldn't/i })).toBeInTheDocument();
  expect(screen.getByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("today controls are keyboard reachable and clearly labeled", async () => {
  render(<TodayScreen date="2026-03-23" />);

  await user.tab();
  expect(screen.getByRole("button", { name: /feeling good/i })).toHaveFocus();
});
```

```tsx
test("shows watch and library paths from the Today screen", async () => {
  render(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/exercises/neck-mobility-5");
  expect(screen.getByRole("link", { name: /browse full library/i })).toHaveAttribute("href", "/library");
});
```

```tsx
test("home route renders the Today screen", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Today screen tests to verify they fail**

Run: `npm run test -- src\features\today\today-screen.test.tsx src\features\logging\exercise-log-actions.test.tsx`
Expected: FAIL because the Today components do not exist

- [ ] **Step 3: Implement a client-only Today data hook**

Create `src\features\today\use-today-data.ts` to:
- call `getTodaysRecommendations`
- load IndexedDB condition/log state after mount
- keep Dexie access out of `src\app\page.tsx`
- expose a stable 3-item recommended list for the selected day
- recompute recommendations after the user saves or edits the daily condition
- only orchestrate reads, writes, and derived view state
- convert the selected date through `toDayKey(...)` before any repository call
- keep any `seedTodayState` helper local to `today-screen.test.tsx` rather than creating a production file for test setup

- [ ] **Step 4: Implement the daily condition card**

Render three large buttons:
- `Feeling good`
- `Okay`
- `Tired`

Include an optional note textarea and one explicit `Save condition` button. When the user returns later that same day, prefill the saved condition and note.

- [ ] **Step 5: Add a shared logging action component**

Create `src\features\logging\components\exercise-log-actions.tsx` so `Today` and exercise detail reuse the same `Did it`, `Partly`, and `Couldn't` controls and success-state messaging.

- [ ] **Step 6: Implement the recommended exercise cards**

Each card should show:
- title
- short description
- duration
- intensity
- `Watch`
- `Did it`
- `Partly`
- `Couldn't`

Components emit callbacks only.

Behavior rules:
- `Watch` navigates to `/exercises/${exerciseId}`
- include a clear secondary link to `/library`
- when a log already exists for the card, show the current saved result state immediately on render
- `TodayScreen` renders the current date clearly above the recommended list
- `use-today-data.ts` performs repository reads/writes and refreshes derived view state after logging or saving a condition

- [ ] **Step 7: Integrate the Today page route**

Keep `src\app\page.tsx` thin: render the client Today screen, pass `date={toDayKey(new Date())}`, and avoid direct IndexedDB access in the route file.

- [ ] **Step 8: Run the Today tests, lint, and build**

Run: `npm run test -- src\app\page.test.tsx src\features\today\today-screen.test.tsx src\features\logging\exercise-log-actions.test.tsx src\features\storage\storage.test.ts && npm run lint && npm run build`
Expected:
- focused tests PASS
- lint passes
- build passes

- [ ] **Step 9: Commit**

```bash
git add src\app\page.tsx src\app\page.test.tsx src\features\logging src\features\today
git commit -m "feat: add today screen logging flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Chunk 3: Library, history, and PWA completion

### Task 5: Add the library browse and exercise detail flows

**Files:**
- Create: `src\features\library\components\library-filters.tsx`
- Create: `src\features\library\components\library-screen.tsx`
- Create: `src\features\library\components\exercise-detail-screen.tsx`
- Create: `src\features\library\library-screen.test.tsx`
- Create: `src\app\exercises\[exerciseId]\page.tsx`
- Create: `src\app\exercises\[exerciseId]\page.test.tsx`
- Modify: `src\app\library\page.tsx`
- Modify: `src\features\logging\components\exercise-log-actions.tsx`

- [ ] **Step 1: Write the failing library tests**

```tsx
test("filters the exercise library by body area and duration", async () => {
  render(<LibraryScreen />);

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.selectOptions(screen.getByLabelText(/duration/i), "5");

  expect(screen.getAllByRole("article")).toHaveLength(1);
});
```

```tsx
test("filters the exercise library by purpose and intensity", async () => {
  render(<LibraryScreen />);

  await user.selectOptions(screen.getByLabelText(/purpose/i), "mobility");
  await user.selectOptions(screen.getByLabelText(/intensity/i), "low");

  expect(screen.getAllByRole("article")).toHaveLength(1);
});
```

```tsx
test("library supports simple text search", async () => {
  render(<LibraryScreen />);

  await user.type(screen.getByLabelText(/search exercises/i), "neck");
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});
```

```tsx
test("library cards link to the exercise detail route", async () => {
  render(<LibraryScreen />);

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/exercises/neck-mobility-5");
});
```

```tsx
test("exercise detail page shows video, metadata, and logging actions", () => {
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  expect(screen.getByRole("link", { name: /watch video/i })).toHaveAttribute("href", expect.stringContaining("youtube"));
  expect(screen.getByText(/gentle seated mobility work/i)).toBeInTheDocument();
  expect(screen.getByText(/mobility/i)).toBeInTheDocument();
  expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /did it/i, exact: false })).toBeInTheDocument();
});
```

```tsx
test("exercise detail logging persists the selected result", async () => {
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  await user.click(screen.getByRole("button", { name: /did it/i, exact: false }));
  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

```tsx
test("exercise detail hydrates an existing log state on first render", async () => {
  await seedTodayState();
  render(<ExerciseDetailPage params={{ exerciseId: "neck-mobility-5" }} />);

  expect(await screen.findByText(/logged for today/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`
Expected: FAIL because the library screens and detail route do not exist

- [ ] **Step 3: Implement the library filter controls**

Add mobile-friendly filters for:
- body area
- purpose
- duration
- intensity

Keep `library-filters.tsx` responsible for filter controls only.

- [ ] **Step 4: Implement the library screen result composition**

Keep `library-screen.tsx` responsible for composing the filtered result set.

Add one plain-language search field labeled `Search exercises`.

Search matching rules:
- match exercise `title`
- match exercise `description`
- do not match hidden/internal IDs

- [ ] **Step 5: Implement the exercise detail screen and thin route**

Create `src\features\library\components\exercise-detail-screen.tsx` for the client/detail UI.

Keep `src\app\exercises\[exerciseId]\page.tsx` thin:
- read the exercise from the bundled catalog
- statically generate route params
- pass the selected exercise into the feature component
- avoid burying client UI logic in the route file

- [ ] **Step 6: Run library and detail tests**

Run: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\today\today-screen.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src\app\library src\app\exercises src\features\library src\features\logging
git commit -m "feat: add library browsing and exercise details" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Add history calendar and daily summary review

**Files:**
- Create: `src\lib\date\month-grid.ts`
- Create: `src\features\history\history-query.ts`
- Create: `src\features\history\components\history-calendar.tsx`
- Create: `src\features\history\components\day-summary.tsx`
- Create: `src\features\history\components\history-screen.tsx`
- Create: `src\features\history\history-screen.test.tsx`
- Modify: `src\app\history\page.tsx`

- [ ] **Step 1: Write the failing history tests**

```tsx
test("marks days with exercise logs in the calendar and shows the selected day summary", async () => {
  await seedLogsForHistory();
  render(<HistoryScreen month="2026-03" />);

  expect(screen.getByRole("button", { name: /march 23, completed/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /march 23, completed/i }));
  expect(await screen.findByText(/neck mobility/i)).toBeInTheDocument();
  expect(await screen.findByText(/did it/i)).toBeInTheDocument();
  expect(await screen.findByText(/tired/i)).toBeInTheDocument();
  expect(await screen.findByText(/legs feel heavy/i)).toBeInTheDocument();
});
```

Keep `seedLogsForHistory` local to `src\features\history\history-screen.test.tsx`.

- [ ] **Step 2: Run the history tests to verify they fail**

Run: `npm run test -- src\features\history\history-screen.test.tsx`
Expected: FAIL because the calendar and summary components do not exist

- [ ] **Step 3: Implement the month grid helper**

Use `month-grid.ts` to generate a stable 6-row calendar grid.

- [ ] **Step 4: Implement the history query helper**

Use `history-query.ts` to gather:
- month-level completed-day markers
- selected-day logs
- selected-day condition and note

- [ ] **Step 5: Implement the history screen**

Render completed days with visible state and accessible labels by consuming `history-query.ts`.

- [ ] **Step 6: Implement the day summary panel**

Show:
- logged exercises
- result chips
- the daily condition entry
- the daily note, if present

Keep Dexie access inside `history-query.ts` and repository/helpers, not directly inside page components.

- [ ] **Step 7: Run history plus storage tests**

Run: `npm run test -- src\features\history\history-screen.test.tsx src\features\storage\storage.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src\lib\date\month-grid.ts src\app\history\page.tsx src\features\history
git commit -m "feat: add history calendar review" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 7: Finish PWA behavior, offline essentials, and final verification

**Files:**
- Create: `public\manifest.webmanifest`
- Create: `public\icons\icon-192.png`
- Create: `public\icons\icon-512.png`
- Create: `src\app\icon.svg`
- Modify: `next.config.ts`
- Modify: `src\app\layout.tsx`
- Test: `src\app\page.test.tsx`

- [ ] **Step 1: Write the failing metadata test**

```tsx
import { metadata } from "./layout";

test("layout includes installable app metadata", () => {
  expect(metadata.applicationName).toBe("Exercise Log");
  expect(metadata.manifest).toBe("/manifest.webmanifest");
});
```

- [ ] **Step 2: Run the metadata test to verify it fails**

Run: `npm run test -- src\app\page.test.tsx`
Expected: FAIL until manifest and metadata are wired up

- [ ] **Step 3: Create the PWA icon assets**

Create:
- `public\icons\icon-192.png`
- `public\icons\icon-512.png`
- `src\app\icon.svg`

Use a simple branded app icon so the manifest `icons` entries point at real files.

- [ ] **Step 4: Add manifest and layout metadata**

Configure:
- `manifest.webmanifest`
- app name and theme metadata in `layout.tsx`

Minimum manifest fields:

```json
{
  "name": "Exercise Log",
  "short_name": "Exercise Log",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 5: Add `next-pwa` integration**

Wire `next-pwa` in `next.config.ts` so the exported app emits a service worker for cached static assets.

- [ ] **Step 6: Verify built PWA artifacts are emitted**

Run: `npm run build`
Expected:
- build PASS
- `out\manifest.webmanifest` exists
- generated static files for `/`, `/library`, and `/history` exist under `out\`
- `out\exercises\neck-mobility-5\index.html` exists
- next-pwa service worker output such as `out\sw.js` exists

- [ ] **Step 7: Run the full verification suite**

Run: `npm run test && npm run lint && npm run build`
Expected: all commands PASS and the static export completes successfully

- [ ] **Step 8: Smoke-check offline and installability behavior**

Run: `npx serve out`
Expected:
- if `serve` is not already available, `npx` installs it before launching
- the built app loads locally
- `Today`, `Library`, and `History` routes render
- in browser DevTools `Application > Manifest`, installability shows no blocking icon/manifest errors
- in `Application > Service Workers`, a service worker is registered and active
- after loading `/`, `/library`, and `/history` once, switching the browser to Offline and refreshing those visited routes still renders content
- previously saved IndexedDB data still appears in the browser

- [ ] **Step 9: Commit**

```bash
git add next.config.ts public\manifest.webmanifest src\app\layout.tsx src\app\icon.svg
git commit -m "feat: finish pwa setup and verification" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Final Verification Checklist

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Verify `Today`, `Library`, and `History` navigation on mobile-width viewport
- [ ] Verify one daily condition entry can be edited and re-read after reload
- [ ] Verify exercise log state persists after reload
- [ ] Verify history calendar shows completed days accurately
- [ ] Verify the app installs as a PWA in a supported browser
