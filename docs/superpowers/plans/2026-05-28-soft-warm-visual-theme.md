# Soft Warm Visual Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参照画像のような暖色で柔らかいトーンをアプリ全体へ適用しつつ、可読性を維持したまま下部ナビを淡色化する。

**Architecture:** `src/app/globals.css` をテーマトークン中心に再構成し、共通UI（背景、カード、ボタン、入力、モーダル、下部ナビ）へ段階適用する。見た目変更の退行を抑えるため、Vitest で CSS 文字列契約テストを先に作り、トークン定義・適用・意味色維持を順に実装する。

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest

---

## File Structure / Responsibilities

- Modify: `src/app/globals.css`  
  全体テーマトークン定義と各コンポーネントの色・影・境界線・フォーカス配色を管理する単一スタイルソース。
- Create: `src/app/globals-theme.test.ts`  
  テーマトークンの存在、主要セレクタへの適用、意味色維持、下部ナビ淡色化を検証する CSS 契約テスト。
- Modify: `docs/superpowers/specs/2026-05-28-soft-warm-visual-theme-design.md`（必要時のみ）  
  実装中に仕様差分が見つかった場合の軽微な追記先。

### Task 1: Add failing CSS contract tests for warm theme tokens

**Files:**
- Create: `src/app/globals-theme.test.ts`
- Test: `src/app/globals-theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readGlobalsCss() {
  return readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
}

describe("globals.css warm theme contract", () => {
  test("defines warm theme tokens in :root", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--bg-soft:");
    expect(css).toContain("--surface-soft:");
    expect(css).toContain("--text-strong:");
    expect(css).toContain("--accent-strong:");
    expect(css).toContain("--nav-surface:");
  });

  test("uses tokens in body/card/primary button styles", () => {
    const css = readGlobalsCss();
    expect(css).toContain("body {");
    expect(css).toContain("background: var(--bg-soft)");
    expect(css).toContain(".card {");
    expect(css).toContain("background: var(--surface-soft)");
    expect(css).toContain(".today-screen__primary-button");
    expect(css).toContain("background: var(--accent-strong)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL because token names and `var(...)` references do not exist yet.

- [ ] **Step 3: Tighten the failing contract to prevent false positives**

```ts
test("declares nav token and applies it in nav block", () => {
  const css = readGlobalsCss();
  expect(css).toContain("--nav-surface:");
  expect(css).toContain(".bottom-nav {");
  expect(css).toContain("background: var(--nav-surface)");
});
```

- [ ] **Step 4: Re-run test to confirm failing assertions are stable**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL with the same missing-token assertions (stable red state for TDD).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals-theme.test.ts
git commit -m "test: add globals css warm theme contract tests"
```

### Task 2: Implement warm root tokens and base surface/button migration

**Files:**
- Modify: `src/app/globals.css:1-220`
- Test: `src/app/globals-theme.test.ts`

- [ ] **Step 1: Write the next failing assertion for warm palette usage**

```ts
test("uses warm gradient and readable strong text", () => {
  const css = readGlobalsCss();
  expect(css).toContain("background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%)");
  expect(css).toContain("color: var(--text-strong)");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL because `--bg-top` and warm gradient token usage are missing.

- [ ] **Step 3: Write minimal implementation in globals.css**

```css
:root {
  color-scheme: light;
  font-family: Inter, Arial, Helvetica, sans-serif;
  --bg-top: #fff8f4;
  --bg-soft: #f8efe8;
  --surface-soft: #fffaf6;
  --surface-elevated: #ffffff;
  --text-strong: #3b2f2a;
  --text-muted: #6f5f57;
  --border-soft: #ecdccf;
  --accent-strong: #9a5c49;
  --accent-soft: #f2ddd3;
  --focus-ring: #b87560;
  --nav-surface: #fdf4ee;
  --nav-text: #6d5a50;
  --success-bg: #dff3e6;
  --success-text: #166534;
  --danger-bg: #fdecea;
  --danger-text: #b91c1c;
}

body {
  background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-soft) 100%);
  color: var(--text-strong);
}

.card {
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  box-shadow: 0 16px 36px rgba(59, 47, 42, 0.08);
}

.today-screen__primary-button,
.recommendation-card__watch-link,
.exercise-log-actions__button {
  background: var(--accent-strong);
  color: #ffffff;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: PASS for token and base surface/button contract tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/globals-theme.test.ts
git commit -m "feat: add warm theme tokens and base surface styles"
```

### Task 3: Migrate bottom nav + form focus states while preserving semantic colors

**Files:**
- Modify: `src/app/globals.css:510-1205`
- Modify: `src/app/globals-theme.test.ts`
- Test: `src/app/globals-theme.test.ts`

- [ ] **Step 1: Write failing tests for nav soft style and semantic colors**

```ts
test("styles bottom nav with light warm surface and accented active state", () => {
  const css = readGlobalsCss();
  expect(css).toContain(".bottom-nav {");
  expect(css).toContain("background: var(--nav-surface)");
  expect(css).toContain(".bottom-nav__link[aria-current=\"page\"]");
  expect(css).toContain("background: var(--accent-soft)");
  expect(css).toContain("color: var(--text-strong)");
});

test("keeps semantic success and danger colors explicit", () => {
  const css = readGlobalsCss();
  expect(css).toContain(".data-management__status {");
  expect(css).toContain("background: var(--success-bg)");
  expect(css).toContain("color: var(--success-text)");
  expect(css).toContain(".data-management__status--error {");
  expect(css).toContain("background: var(--danger-bg)");
  expect(css).toContain("color: var(--danger-text)");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL because bottom nav and semantic classes still use hard-coded values.

- [ ] **Step 3: Implement nav/focus/semantic migration in globals.css**

```css
.bottom-nav {
  background: var(--nav-surface);
  box-shadow: 0 18px 36px rgba(59, 47, 42, 0.16);
  border: 1px solid var(--border-soft);
}

.bottom-nav__link {
  color: var(--nav-text);
}

.bottom-nav__link[aria-current="page"] {
  background: var(--accent-soft);
  color: var(--text-strong);
}

.library-filters__field input:focus,
.library-filters__field select:focus,
.modal__field input:focus,
.modal__field select:focus,
.modal__field textarea:focus,
.self-care-log-card__field select:focus,
.self-care-log-card__field textarea:focus {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.data-management__status {
  background: var(--success-bg);
  color: var(--success-text);
}

.data-management__status--error {
  background: var(--danger-bg);
  color: var(--danger-text);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: PASS for nav, focus, and semantic-color assertions.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/globals-theme.test.ts
git commit -m "feat: apply soft warm nav and accessibility-focused control styles"
```

### Task 4: Validate full app safety (tests + build) and finalize

**Files:**
- Modify: `src/app/globals.css` (only if verification reveals missed hard-coded hotspots)
- Test: `src/app/globals-theme.test.ts`

- [ ] **Step 1: Add one final failing guard test for hard-coded dark nav color removal**

```ts
test("removes legacy dark bottom-nav hard-coded colors", () => {
  const css = readGlobalsCss();
  expect(css).not.toContain("background: rgba(20, 33, 61, 0.96)");
  expect(css).not.toContain("color: #dbe5f5");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: FAIL until legacy dark-nav declarations are removed.

- [ ] **Step 3: Remove remaining legacy dark-nav declarations**

```css
.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: min(calc(100% - 2rem), 30rem);
  padding: 0.5rem;
  border-radius: 999px;
  background: var(--nav-surface);
  border: 1px solid var(--border-soft);
  box-shadow: 0 18px 36px rgba(59, 47, 42, 0.16);
}

.bottom-nav__link {
  color: var(--nav-text);
}
```

- [ ] **Step 4: Run full validation commands**

Run: `npm test -- src/app/globals-theme.test.ts`  
Expected: PASS.

Run: `npm test`  
Expected: PASS with all Vitest suites green.

Run: `npm run build`  
Expected: PASS with Next.js build/type-check success.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/globals-theme.test.ts
git commit -m "chore: finalize soft warm theme rollout and validation"
```

## Spec Coverage Check

- Warm soft palette and readability: Task 2, Task 3
- Bottom navigation light style migration: Task 3, Task 4
- Form focus visibility and shared component consistency: Task 3
- Semantic color preservation (success/error): Task 3
- Full-app safety verification: Task 4

No uncovered spec requirements remain.
