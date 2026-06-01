# ExerLog UI Refresh (shadcn/ui + Tailwind) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all ExerLog screens with a mobile-first warm visual system from `DESIGN.md` and migrate the UI base to shadcn/ui + Tailwind without changing domain behavior.

**Architecture:** First establish a tokenized theme and Tailwind/shadcn foundation, then replace shared shell/components, and finally migrate each screen composition onto shared primitives. Keep storage/query/hooks unchanged and constrain changes to presentation and interaction layers. Validate with focused screen/component tests first, then project-wide lint/build/test.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Testing Library

---

## File Structure Map

- **Foundation/config**
  - Create: `postcss.config.mjs`
  - Create: `tailwind.config.ts`
  - Create: `components.json`
  - Modify: `package.json`
  - Create: `src/lib/utils.ts`
- **Theme + app shell**
  - Modify: `src/app/globals.css`
  - Modify: `src/app/layout.tsx`
  - Modify: `src/components/app-shell/app-shell.tsx`
  - Modify: `src/components/app-shell/bottom-nav.tsx`
  - Modify: `src/components/app-shell/language-switcher.tsx`
- **shadcn primitives**
  - Create: `src/components/ui/button.tsx`
  - Create: `src/components/ui/card.tsx`
  - Create: `src/components/ui/input.tsx`
  - Create: `src/components/ui/textarea.tsx`
  - Create: `src/components/ui/select.tsx`
  - Create: `src/components/ui/dialog.tsx`
  - Create: `src/components/ui/tabs.tsx`
  - Create: `src/components/ui/badge.tsx`
  - Create: `src/components/ui/separator.tsx`
- **Feature components/screens**
  - Modify: `src/features/today/components/*.tsx`
  - Modify: `src/features/history/components/*.tsx`
  - Modify: `src/features/library/components/*.tsx`
  - Modify: `src/features/self-care/components/*.tsx`
  - Modify: `src/features/settings/components/*.tsx`
- **Tests**
  - Modify: `src/app/globals-theme.test.ts`
  - Modify: `src/components/app-shell/*.test.tsx`
  - Modify: `src/features/today/today-screen.test.tsx`
  - Modify: `src/features/history/history-screen.test.tsx`
  - Modify: `src/features/library/library-screen.test.tsx`
  - Modify: `src/features/self-care/self-care-screen.test.tsx`

### Task 1: Bootstrap Tailwind + shadcn foundation

**Files:**
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: `package.json`
- Test: `npm run build`

- [ ] **Step 1: Write the failing build check**

Run: `npm run build`  
Expected: FAIL due to missing Tailwind/shadcn dependencies and config references.

- [ ] **Step 2: Add dependencies and scripts prerequisites**

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-tabs": "^1.1.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16"
  }
}
```

- [ ] **Step 3: Add Tailwind/PostCSS/shadcn config files**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

```js
// postcss.config.mjs
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 4: Add `cn()` utility**

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Run build to verify foundation passes**

Run: `npm run build`  
Expected: PASS (or fail only on unrelated pre-existing issues).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs tailwind.config.ts components.json src/lib/utils.ts
git commit -m "chore: add tailwind and shadcn foundation"
```

### Task 2: Implement warm tokenized theme + typography in globals

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Test: `src/app/globals-theme.test.ts`

- [ ] **Step 1: Write/adjust failing theme contract tests**

```ts
// add expectations for shadcn token variables and Sofia Sans usage
expectDeclaration(rootBlock, "--background", "24 28% 94%");
expectDeclaration(rootBlock, "--foreground", "20 15% 12%");
expect(getGlobalsCss()).toContain("font-family: 'Sofia Sans'");
```

- [ ] **Step 2: Run targeted test and verify it fails**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL because new token names/values are not yet present.

- [ ] **Step 3: Rewrite global styles to Tailwind-compatible token system**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 24 28% 94%;
  --foreground: 20 15% 12%;
  --card: 0 0% 100%;
  --card-foreground: 20 15% 12%;
  --primary: 15 38% 45%;
  --primary-foreground: 24 35% 95%;
  --secondary: 21 53% 89%;
  --secondary-foreground: 15 38% 32%;
  --muted: 24 24% 90%;
  --muted-foreground: 21 10% 38%;
  --border: 22 31% 84%;
  --ring: 17 42% 56%;
  --radius: 1.25rem;
}
```

- [ ] **Step 4: Align layout metadata theme color with new palette**

```ts
export const viewport: Viewport = {
  themeColor: "#f3f0ee",
};
```

- [ ] **Step 5: Re-run targeted theme test**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/globals-theme.test.ts
git commit -m "feat: add warm tokenized global theme for shadcn"
```

### Task 3: Add core shadcn UI primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/separator.tsx`
- Test: `npm run build`

- [ ] **Step 1: Write failing compile check for missing imports**

Run: `npm run build`  
Expected: FAIL once app-shell/features are updated to import missing `@/components/ui/*`.

- [ ] **Step 2: Create `Button` with variants**

```tsx
// src/components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[20px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-12 px-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-95",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border bg-card text-foreground",
        ghost: "hover:bg-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
```

- [ ] **Step 3: Create form/surface/overlay primitives**

```tsx
// card.tsx
export function Card(props: React.ComponentProps<"section">) {
  return <section {...props} className={cn("rounded-[1.5rem] border bg-card text-card-foreground shadow-sm", props.className)} />;
}
```

```tsx
// input.tsx / textarea.tsx
className={cn("w-full rounded-[1rem] border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
```

- [ ] **Step 4: Add Select/Dialog/Tabs wrappers backed by Radix**

```tsx
// select trigger class baseline
"h-12 w-full rounded-[1rem] border border-border bg-background px-3 text-sm"
```

```tsx
// tabs trigger baseline
"rounded-full px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
```

- [ ] **Step 5: Run build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui
git commit -m "feat: add core shadcn UI primitives"
```

### Task 4: Migrate app shell and shared navigation controls

**Files:**
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/components/app-shell/bottom-nav.tsx`
- Modify: `src/components/app-shell/language-switcher.tsx`
- Modify: `src/components/app-shell/app-shell.test.tsx`
- Modify: `src/components/app-shell/bottom-nav.test.tsx`

- [ ] **Step 1: Write failing app-shell tests for new semantics/classes**

```ts
expect(screen.getByRole("banner")).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: /メイン/i })).toHaveClass("fixed");
```

- [ ] **Step 2: Run targeted tests and verify failure**

Run: `npm test -- src/components/app-shell/app-shell.test.tsx src/components/app-shell/bottom-nav.test.tsx`  
Expected: FAIL on new shell/nav assertions.

- [ ] **Step 3: Refactor shell to shadcn/Tailwind composition**

```tsx
return (
  <div className="mx-auto min-h-dvh w-full max-w-lg bg-gradient-to-b from-background to-muted/45 px-4 pb-28 pt-4">
    <header className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">ExerLog</h1>
      <LanguageSwitcher />
    </header>
    <main className="grid gap-4">{children}</main>
    <BottomNav currentPath={currentPath} />
  </div>
);
```

- [ ] **Step 4: Refactor bottom nav and language switcher using pills + active states**

```tsx
<nav className="fixed bottom-3 left-1/2 z-20 flex w-[min(100%-1rem,32rem)] -translate-x-1/2 rounded-full border bg-card/95 p-1 shadow-lg backdrop-blur" />
```

```tsx
<button className={cn("h-10 rounded-full px-4", language === "ja" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} />
```

- [ ] **Step 5: Re-run targeted tests**

Run: `npm test -- src/components/app-shell/app-shell.test.tsx src/components/app-shell/bottom-nav.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/app-shell
git commit -m "feat: migrate app shell and bottom navigation to shadcn styling"
```

### Task 5: Migrate Today + Self-care screen composition to shadcn primitives

**Files:**
- Modify: `src/features/today/components/today-screen.tsx`
- Modify: `src/features/today/components/daily-condition-card.tsx`
- Modify: `src/features/today/components/recommended-exercise-card.tsx`
- Modify: `src/features/self-care/components/self-care-screen.tsx`
- Modify: `src/features/self-care/components/wellness-card.tsx`
- Modify: `src/features/self-care/components/metrics-card.tsx`
- Modify: `src/features/self-care/components/wellness-score-input.tsx`
- Modify: `src/features/today/today-screen.test.tsx`
- Modify: `src/features/self-care/self-care-screen.test.tsx`

- [ ] **Step 1: Add failing tests for shadcn-driven accessibility hooks**

```ts
expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /save condition/i })).toHaveClass("h-12");
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- src/features/today/today-screen.test.tsx src/features/self-care/self-care-screen.test.tsx`  
Expected: FAIL on class/structure assertions.

- [ ] **Step 3: Replace legacy `.card/.button-row` structure with `Card`, `Button`, `Input`, `Textarea`**

```tsx
<Card className="p-4">
  <h1 className="text-xl font-semibold">{t("today_heading")}</h1>
  <p className="text-sm text-muted-foreground">{t("today_subheading")}</p>
</Card>
```

```tsx
<Button type="button" onClick={() => void saveCondition()}>{t("self_care_save_button")}</Button>
```

- [ ] **Step 4: Refactor score and recommendation controls with shared variants**

```tsx
<div role="group" className="grid grid-cols-5 gap-2">
  {scores.map((score) => (
    <Button key={score} variant={selected === score ? "default" : "secondary"}>{score}</Button>
  ))}
</div>
```

- [ ] **Step 5: Re-run focused tests**

Run: `npm test -- src/features/today/today-screen.test.tsx src/features/self-care/self-care-screen.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/today src/features/self-care
git commit -m "feat: migrate today and self-care screens to shadcn primitives"
```

### Task 6: Migrate History + Library + Settings screens to shadcn primitives

**Files:**
- Modify: `src/features/history/components/history-screen.tsx`
- Modify: `src/features/history/components/history-calendar.tsx`
- Modify: `src/features/history/components/day-summary.tsx`
- Modify: `src/features/history/components/history-graphs.tsx`
- Modify: `src/features/library/components/library-screen.tsx`
- Modify: `src/features/library/components/library-filters.tsx`
- Modify: `src/features/settings/components/settings-screen.tsx`
- Modify: `src/features/settings/components/library-management.tsx`
- Modify: `src/features/settings/components/data-management.tsx`
- Modify: `src/features/settings/components/exercise-form-modal.tsx`
- Modify: `src/features/history/history-screen.test.tsx`
- Modify: `src/features/library/library-screen.test.tsx`
- Modify: `src/features/settings/exercise-form-modal.test.tsx`

- [ ] **Step 1: Add failing tests for tabs/dialog/select based UX**

```ts
expect(screen.getByRole("tab", { name: /summary/i })).toBeInTheDocument();
expect(screen.getByRole("tab", { name: /graphs/i })).toBeInTheDocument();
```

```ts
expect(screen.getByRole("button", { name: /add exercise/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- src/features/history/history-screen.test.tsx src/features/library/library-screen.test.tsx src/features/settings/exercise-form-modal.test.tsx`  
Expected: FAIL on new control semantics.

- [ ] **Step 3: Replace mode toggles and filters with Tabs/Select/Input**

```tsx
<Tabs value={mode} onValueChange={(value) => setMode(value as HistoryMode)}>
  <TabsList>
    <TabsTrigger value="summary">{t("history_mode_summary")}</TabsTrigger>
    <TabsTrigger value="graph">{t("history_mode_graphs")}</TabsTrigger>
  </TabsList>
</Tabs>
```

```tsx
<Input aria-label={t("library_search_label")} value={filters.search} onChange={(e) => onChange({ ...filters, search: e.target.value })} />
```

- [ ] **Step 4: Replace native dialog patterns with shadcn `Dialog` composition**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="rounded-[1.5rem]">
    <DialogHeader><DialogTitle>{t("settings_form_heading_new")}</DialogTitle></DialogHeader>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Re-run focused tests**

Run: `npm test -- src/features/history/history-screen.test.tsx src/features/library/library-screen.test.tsx src/features/settings/exercise-form-modal.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/history src/features/library src/features/settings
git commit -m "feat: migrate history library settings screens to shadcn"
```

### Task 7: Remove obsolete global class styling and lock new contracts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/globals-theme.test.ts`
- Modify: `src/features/history/components/history-graphs.test.tsx` (if selectors changed)
- Modify: `src/features/history/components/day-summary.test.tsx` (if selectors changed)

- [ ] **Step 1: Add failing tests to forbid legacy class contract**

```ts
expect(globalsCss).not.toContain(".today-screen__primary-button");
expect(globalsCss).not.toContain(".bottom-nav__link[aria-current=\"page\"]");
```

- [ ] **Step 2: Run focused test and verify failure**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL because legacy selectors still exist.

- [ ] **Step 3: Remove/trim obsolete selectors from globals and keep only token/base utilities**

```css
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 4: Re-run theme test**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/globals-theme.test.ts
git commit -m "refactor: remove legacy global class styling after shadcn migration"
```

### Task 8: Full verification and release-ready check

**Files:**
- Modify (if needed): any test snapshots/assertions broken by semantic class changes

- [ ] **Step 1: Run full tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Commit final stabilization**

```bash
git add src package.json package-lock.json
git commit -m "feat: complete full-screen shadcn-based UI redesign"
```

