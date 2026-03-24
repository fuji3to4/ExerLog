# Japanese Language Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Japanese-default language switcher for fixed UI strings across the app, persist the selected language locally, and keep exercise titles/descriptions in their original language.

**Architecture:** Introduce a small client-side i18n layer at the app shell boundary. Use a `LanguageProvider` plus static `ja` / `en` message dictionaries, locale-aware formatting helpers, and a header-mounted switcher. Keep external content raw while translating only fixed UI and app-controlled enum labels such as intensity, purpose, condition level, and logging results.

**Tech Stack:** Next.js App Router, React 19, TypeScript, localStorage, `Intl.DateTimeFormat`, Vitest, React Testing Library

---

## File Structure

### New i18n foundation

- Create: `src\features\i18n\language.ts` - language type, storage key, locale map, validation, and initial-language resolution helpers.
- Create: `src\features\i18n\formatting.ts` - locale-aware date helpers and fixed enum-label formatters.
- Create: `src\features\i18n\messages\ja.ts` - Japanese message dictionary for all fixed UI keys.
- Create: `src\features\i18n\messages\en.ts` - English message dictionary for all fixed UI keys.
- Create: `src\features\i18n\messages\index.ts` - shared message types and exported dictionaries.
- Create: `src\features\i18n\language-provider.tsx` - provider, context, and language state synchronization with `localStorage` and `document.documentElement.lang`.
- Create: `src\features\i18n\use-translation.ts` - hook returning `language`, `setLanguage`, `messages`, and formatting helpers.
- Create: `src\features\i18n\language-provider.test.tsx` - focused tests for default language, persisted language, invalid fallback, and `html lang` updates.
- Create: `src\test\render-with-language.tsx` - test helper that seeds language state and renders with `LanguageProvider`.

### Shared shell

- Modify: `src\app\layout.tsx` - wrap the app with `LanguageProvider`, inject the pre-hydration language bootstrap script, and mark the document for safe hydration.
- Modify: `src\app\globals.css` - add header layout rules so the switcher stays visible on narrow screens.
- Create: `src\components\app-shell\language-switcher.tsx` - always-visible header switcher with `日本語 / English`.
- Modify: `src\components\app-shell\app-shell.tsx` - add the top header region and keep the bottom nav below the page content.
- Create: `src\components\app-shell\app-shell.test.tsx` - verify the switcher is visible in the header and updates the shell text.
- Modify: `src\components\app-shell\bottom-nav.tsx` - translate nav labels and nav `aria-label`.
- Modify: `src\components\app-shell\bottom-nav.test.tsx` - assert translated nav labels and active state.

### Today flow and shared logging UI

- Modify: `src\features\logging\components\exercise-log-actions.tsx` - translate button labels, group label, and saved-state copy.
- Modify: `src\features\logging\exercise-log-actions.test.tsx` - assert Japanese default labels and saved-state text.
- Modify: `src\features\today\components\daily-condition-card.tsx` - translate heading, helper copy, radio labels, note label, placeholder, and save button.
- Modify: `src\features\today\components\recommended-exercise-card.tsx` - translate fixed watch/meta labels while leaving exercise content raw.
- Modify: `src\features\today\components\today-screen.tsx` - translate page copy and use locale-aware date formatting.
- Modify: `src\features\today\recommended-exercise-card.test.tsx` - assert the watch label changes but the exercise title stays raw.
- Modify: `src\features\today\today-screen.test.tsx` - update tests to render with the provider and verify language switching behavior.

### Library and exercise detail

- Modify: `src\features\library\components\library-filters.tsx` - translate headings, labels, placeholders, and option labels.
- Modify: `src\features\library\components\library-screen.tsx` - translate fixed UI, meta labels, and watch link copy while keeping titles/descriptions raw.
- Modify: `src\features\library\components\exercise-detail-screen.tsx` - translate fixed labels, loading copy, and enum display values.
- Modify: `src\features\library\library-screen.test.tsx` - verify filter labels and raw exercise content behavior.
- Modify: `src\app\exercises\[exerciseId]\page.test.tsx` - update detail-page expectations for Japanese default UI and persisted log text.

### History flow

- Modify: `src\features\history\components\history-screen.tsx` - translate page header copy.
- Modify: `src\features\history\components\history-calendar.tsx` - translate calendar headings, use locale-aware day labels, and localize the “completed” suffix.
- Modify: `src\features\history\components\day-summary.tsx` - translate section headings, empty states, result labels, and condition labels while leaving exercise titles raw.
- Modify: `src\features\history\history-screen.test.tsx` - assert localized calendar labels and summary copy.

### Test setup

- Modify: `vitest.setup.ts` - clear `localStorage` between tests so language persistence does not leak across cases.
- Modify: `src\app\page.test.tsx` - render the home route through the new shell and verify the Japanese-default navigation remains visible.

## Task 1: Build the i18n core and test harness

**Files:**
- Create: `src\features\i18n\language.ts`
- Create: `src\features\i18n\formatting.ts`
- Create: `src\features\i18n\messages\ja.ts`
- Create: `src\features\i18n\messages\en.ts`
- Create: `src\features\i18n\messages\index.ts`
- Create: `src\features\i18n\language-provider.tsx`
- Create: `src\features\i18n\use-translation.ts`
- Create: `src\features\i18n\language-provider.test.tsx`
- Create: `src\test\render-with-language.tsx`
- Modify: `vitest.setup.ts`

- [ ] **Step 1: Write the failing provider tests**

```tsx
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "./language-provider";
import { useTranslation } from "./use-translation";

function Probe() {
  const { language } = useTranslation();
  return <span>{language}</span>;
}

test("defaults to Japanese when no persisted value exists", () => {
  window.localStorage.removeItem("exerlog-language");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("ja")).toBeInTheDocument();
});

test("uses persisted English and updates document lang", () => {
  window.localStorage.setItem("exerlog-language", "en");
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
  expect(screen.getByText("en")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
});
```

- [ ] **Step 2: Run the focused i18n test**

Run: `npm run test -- src\features\i18n\language-provider.test.tsx`  
Expected: FAIL because the provider, hook, and helpers do not exist yet.

- [ ] **Step 3: Implement the minimal i18n core**

```ts
export type Language = "ja" | "en";

export const DEFAULT_LANGUAGE: Language = "ja";
export const LANGUAGE_STORAGE_KEY = "exerlog-language";

export function isLanguage(value: string | null): value is Language {
  return value === "ja" || value === "en";
}

export function readStoredLanguage(): Language {
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
```

```tsx
const [language, setLanguageState] = useState<Language>(() =>
  typeof document !== "undefined" && (document.documentElement.dataset.language === "ja" || document.documentElement.dataset.language === "en")
    ? (document.documentElement.dataset.language as Language)
    : readStoredLanguage(),
);
```

Implement `ja` / `en` dictionaries with stable keys for:
- shell labels
- today/library/history/detail copy
- logging result labels
- condition labels
- intensity/purpose/body-area display labels

Add `afterEach(() => window.localStorage.clear())` to `vitest.setup.ts`.

- [ ] **Step 4: Re-run the focused i18n test**

Run: `npm run test -- src\features\i18n\language-provider.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the foundation**

```bash
git add vitest.setup.ts src/features/i18n src/test/render-with-language.tsx
git commit -m "feat: add i18n language foundation"
```

## Task 2: Integrate the language provider into the app shell

**Files:**
- Modify: `src\app\layout.tsx`
- Modify: `src\app\globals.css`
- Create: `src\components\app-shell\language-switcher.tsx`
- Modify: `src\components\app-shell\app-shell.tsx`
- Create: `src\components\app-shell\app-shell.test.tsx`
- Modify: `src\components\app-shell\bottom-nav.tsx`
- Modify: `src\components\app-shell\bottom-nav.test.tsx`
- Modify: `src\app\page.test.tsx`

- [ ] **Step 1: Write the failing shell tests**

```tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";

test("shows the language switcher in the header on mobile-sized layouts", () => {
  renderWithLanguage(
    <AppShell currentPath="/">
      <section>content</section>
    </AppShell>,
  );

  expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /メインナビゲーション/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell-focused tests**

Run: `npm run test -- src\components\app-shell\app-shell.test.tsx src\components\app-shell\bottom-nav.test.tsx src\app\page.test.tsx`  
Expected: FAIL because there is no translated header and the nav still renders English text.

- [ ] **Step 3: Implement the shell integration**

```tsx
<html lang="ja" suppressHydrationWarning>
  <body>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            var value = localStorage.getItem("exerlog-language");
            var language = value === "en" ? "en" : "ja";
            document.documentElement.lang = language;
            document.documentElement.dataset.language = language;
          })();
        `,
      }}
    />
    <LanguageProvider>{children}</LanguageProvider>
  </body>
</html>
```

```tsx
<header className="app-shell__header">
  <h1 className="app-shell__brand">ExerLog</h1>
  <LanguageSwitcher />
</header>
```

Translate the bottom nav labels and `aria-label`, and keep the switcher directly visible in the header instead of hiding it in a menu.
Add only the CSS needed to keep the header readable and the switcher reachable at mobile widths.

- [ ] **Step 4: Re-run the shell-focused tests**

Run: `npm run test -- src\components\app-shell\app-shell.test.tsx src\components\app-shell\bottom-nav.test.tsx src\app\page.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the shell work**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/app-shell src/app/page.test.tsx
git commit -m "feat: add header language switcher"
```

## Task 3: Translate the Today screen and shared logging controls

**Files:**
- Modify: `src\features\logging\components\exercise-log-actions.tsx`
- Modify: `src\features\logging\exercise-log-actions.test.tsx`
- Modify: `src\features\today\components\daily-condition-card.tsx`
- Modify: `src\features\today\components\recommended-exercise-card.tsx`
- Modify: `src\features\today\components\today-screen.tsx`
- Modify: `src\features\today\recommended-exercise-card.test.tsx`
- Modify: `src\features\today\today-screen.test.tsx`

- [ ] **Step 1: Add failing Today/logging tests for Japanese default and raw exercise titles**

```tsx
test("shows Japanese fixed UI by default while leaving exercise titles unchanged", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /体調を保存/i })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Neck Mobility を見る/i })).toBeInTheDocument();
});
```

```tsx
test("switches Today fixed UI to English without translating exercise content", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save condition/i })).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "Neck Mobility" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused Today tests**

Run: `npm run test -- src\features\today\today-screen.test.tsx src\features\today\recommended-exercise-card.test.tsx src\features\logging\exercise-log-actions.test.tsx`  
Expected: FAIL because the components still hardcode English strings and use `en-US` formatting directly.

- [ ] **Step 3: Implement the Today translations**

```tsx
const { t, formatLongDate, formatResultLabel, formatConditionLabel, formatIntensityLabel } = useTranslation();

<h1>{t("today.title")}</h1>
<p>{formatLongDate(date)}</p>
<button>{t("today.saveCondition")}</button>
<Link aria-label={t("common.watchExercise", { title: exercise.title })}>
  {t("common.watch")}
</Link>
```

Translate:
- Today page heading and helper copy
- loading state copy
- daily condition radio labels and note text
- exercise logging button labels and saved-state text
- watch-link verbs and fixed metadata labels

Do **not** translate `exercise.title` or `exercise.description`.

- [ ] **Step 4: Re-run the focused Today tests**

Run: `npm run test -- src\features\today\today-screen.test.tsx src\features\today\recommended-exercise-card.test.tsx src\features\logging\exercise-log-actions.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the Today flow**

```bash
git add src/features/logging src/features/today
git commit -m "feat: translate today flow"
```

## Task 4: Translate the Library and exercise detail fixed UI

**Files:**
- Modify: `src\features\library\components\library-filters.tsx`
- Modify: `src\features\library\components\library-screen.tsx`
- Modify: `src\features\library\components\exercise-detail-screen.tsx`
- Modify: `src\features\library\library-screen.test.tsx`
- Modify: `src\app\exercises\[exerciseId]\page.test.tsx`

- [ ] **Step 1: Write failing Library/detail tests**

```tsx
test("renders Japanese library filters by default", () => {
  renderWithLanguage(<LibraryScreen />);

  expect(screen.getByRole("heading", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/運動を検索/i)).toHaveAttribute("placeholder", "タイトルまたは説明で検索");
  expect(screen.getByRole("link", { name: /Neck Mobility を見る/i })).toBeInTheDocument();
});
```

```tsx
test("keeps imported content raw on the detail screen", async () => {
  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }));

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /動画を見る/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused Library/detail tests**

Run: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`  
Expected: FAIL because filter copy, watch labels, metadata labels, and loading copy are still English-only.

- [ ] **Step 3: Implement the Library/detail translations**

```tsx
<dt>{t("exercise.duration")}</dt>
<dd>{t("exercise.minutes", { count: exercise.durationMinutes })}</dd>

<dt>{t("exercise.intensity")}</dt>
<dd>{formatIntensityLabel(exercise.intensity)}</dd>
```

Translate:
- library page heading and helper copy
- filter group heading, labels, placeholders, and select option labels
- watch-link verb and `aria-label`
- detail-page loading copy and fixed metadata labels
- app-controlled enum values (`purpose`, `intensity`, `bodyArea`)

Leave the exercise title and description untouched.

- [ ] **Step 4: Re-run the focused Library/detail tests**

Run: `npm run test -- src\features\library\library-screen.test.tsx src\app\exercises\[exerciseId]\page.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the Library/detail work**

```bash
git add src/features/library src/app/exercises/[exerciseId]/page.test.tsx
git commit -m "feat: translate library and detail screens"
```

## Task 5: Translate the History flow and locale-aware calendar labels

**Files:**
- Modify: `src\features\history\components\history-screen.tsx`
- Modify: `src\features\history\components\history-calendar.tsx`
- Modify: `src\features\history\components\day-summary.tsx`
- Modify: `src\features\history\history-screen.test.tsx`

- [ ] **Step 1: Write failing History tests**

```tsx
test("uses Japanese calendar labels and summary copy by default", async () => {
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />);

  const completedDay = await screen.findByRole("button", { name: /3月23日.*実施済み/i });
  expect(completedDay).toBeInTheDocument();
});
```

```tsx
test("switches history copy to English while keeping exercise titles raw", async () => {
  await seedLogsForHistory();
  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(screen.getByText("Neck Mobility")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused History test**

Run: `npm run test -- src\features\history\history-screen.test.tsx`  
Expected: FAIL because calendar labels, empty-state copy, and result labels are still English-only.

- [ ] **Step 3: Implement the History translations**

```tsx
function formatCalendarLabel(date: string, completed: boolean) {
  const label = formatMonthDay(date);
  return completed ? t("history.completedDay", { date: label }) : label;
}
```

Translate:
- history page heading and helper copy
- calendar section heading and instructions
- calendar `aria-label` content with localized date formatting
- day-summary section headings and empty states
- result labels (`did`, `partial`, `could_not`) and condition labels (`good`, `okay`, `tired`)

Keep exercise titles raw inside the day summary.

- [ ] **Step 4: Re-run the focused History test**

Run: `npm run test -- src\features\history\history-screen.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the History work**

```bash
git add src/features/history
git commit -m "feat: translate history flow"
```

## Task 6: Run full verification and acceptance checks

**Files:**
- Modify as needed: any files touched in Tasks 1-5 to address failures uncovered by the full suite

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`  
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 4: Check the finished behavior against the spec**

Confirm in code and tests that:
- Japanese is the default when no value is stored
- invalid stored values fall back to Japanese
- the header switcher is always visible
- the selected language persists
- fixed UI translates across Today, Library, History, and detail screens
- exercise titles/descriptions stay in their original language
- `html lang` and localized date formatting match the active language

- [ ] **Step 5: Commit the verified feature**

```bash
git add src docs/superpowers/plans/2026-03-24-japanese-language-switcher.md
git commit -m "feat: add Japanese-default language switching"
```
