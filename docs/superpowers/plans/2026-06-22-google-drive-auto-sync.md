# Google Drive Auto-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic 30-second debounced sync to Google Sheets on every data save, plus a header indicator for login state and sign-in/sign-out.

**Architecture:** A new `auto-sync.ts` module with `scheduleSync()` (debounced `syncAll` call). Each repository file calls `scheduleSync()` after writing to IndexedDB. A `SyncIndicator` component in the AppShell header shows login state with a dropdown for disconnect.

**Tech Stack:** TypeScript, React 19, Vitest, Google Identity Services, Google Sheets API v4

---

## File Structure

| Purpose | File | Action |
|---------|------|--------|
| Auto-sync module | `src/features/sync/auto-sync.ts` | Create |
| Auto-sync tests | `src/features/sync/auto-sync.test.ts` | Create |
| Header indicator | `src/features/shell/components/sync-indicator.tsx` | Create |
| Header indicator tests | `src/features/shell/components/sync-indicator.test.tsx` | Create |
| AppShell | `src/components/app-shell/app-shell.tsx` | Modify — add SyncIndicator |
| Exercise logs repo | `src/features/storage/exercise-logs.repository.ts` | Modify — add scheduleSync() call |
| Daily condition repo | `src/features/storage/daily-condition.repository.ts` | Modify — add scheduleSync() call |
| Daily wellness repo | `src/features/storage/daily-wellness.repository.ts` | Modify — add scheduleSync() call |
| Daily metrics repo | `src/features/storage/daily-metrics.repository.ts` | Modify — add scheduleSync() call |
| Daily self-care repo | `src/features/storage/daily-self-care.repository.ts` | Modify — add scheduleSync() call |
| SyncProvider | `src/features/sync/SyncProvider.tsx` | Modify — add syncIfNeeded() on mount |
| i18n en | `src/features/i18n/messages/en.ts` | Modify — add 3 indicator keys |
| i18n ja | `src/features/i18n/messages/ja.ts` | Modify — add same 3 indicator keys |

---

### Task 1: Create auto-sync.ts

**Files:**
- Create: `src/features/sync/auto-sync.ts`
- Test: `src/features/sync/auto-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/sync/auto-sync.test.ts
import { describe, expect, test, vi, beforeEach } from "vitest";
import { scheduleSync, syncIfNeeded, SYNC_DEBOUNCE_MS } from "./auto-sync";

// Mock dependencies
const mockTrySilentRefresh = vi.fn();
const mockSyncAll = vi.fn();

vi.mock("./google-auth", () => ({
  trySilentRefresh: mockTrySilentRefresh,
}));

vi.mock("./sync-engine", () => ({
  syncAll: mockSyncAll,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduleSync", () => {
  test("calls syncAll after debounce delay when token is valid", async () => {
    mockTrySilentRefresh.mockResolvedValue({ accessToken: "tok" });
    mockSyncAll.mockResolvedValue({ success: true, results: [] });

    scheduleSync();
    expect(mockTrySilentRefresh).not.toHaveBeenCalled(); // not yet

    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);

    // Wait for the async callback to complete
    await vi.waitFor(() => {
      expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncAll).toHaveBeenCalledWith("tok", expect.any(Function));
  });

  test("does nothing when no token (not logged in)", async () => {
    mockTrySilentRefresh.mockResolvedValue(null);

    scheduleSync();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);

    await vi.waitFor(() => {
      expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  test("debounces multiple calls within the delay window", async () => {
    mockTrySilentRefresh.mockResolvedValue({ accessToken: "tok" });
    mockSyncAll.mockResolvedValue({ success: true, results: [] });

    scheduleSync();
    scheduleSync();
    scheduleSync();

    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS - 1);

    // Should not have fired yet
    expect(mockTrySilentRefresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    await vi.waitFor(() => {
      expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1); // only once
    });
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });
});

describe("syncIfNeeded", () => {
  test("cancels pending timer and syncs immediately", async () => {
    mockTrySilentRefresh.mockResolvedValue({ accessToken: "tok" });
    mockSyncAll.mockResolvedValue({ success: true, results: [] });

    scheduleSync(); // start a pending timer
    await syncIfNeeded(); // should cancel it and sync now

    expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1);
    expect(mockSyncAll).toHaveBeenCalledWith("tok", expect.any(Function));

    // Advance past original timer to ensure no double call
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);
    expect(mockSyncAll).toHaveBeenCalledTimes(1);
  });

  test("does nothing when no token", async () => {
    mockTrySilentRefresh.mockResolvedValue(null);

    await syncIfNeeded();

    expect(mockSyncAll).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/sync/auto-sync.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/sync/auto-sync.ts
import { trySilentRefresh } from "./google-auth";
import { syncAll } from "./sync-engine";

/** Debounce delay in milliseconds before auto-sync fires. */
export const SYNC_DEBOUNCE_MS = 30000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a sync to run after a debounce delay.
 * Each call resets the timer. Safe to call from any save handler.
 */
export function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    syncTimer = null;
    const token = await trySilentRefresh();
    if (!token) return;
    await syncAll(token.accessToken);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Cancel any pending timer and sync immediately.
 * Used on page load to flush unsent data.
 */
export async function syncIfNeeded(): Promise<void> {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const token = await trySilentRefresh();
  if (!token) return;
  await syncAll(token.accessToken);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/sync/auto-sync.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/sync/auto-sync.ts src/features/sync/auto-sync.test.ts
git commit -m "feat(sync): add auto-sync module with 30s debounce"
```

---

### Task 2: Add scheduleSync() calls to repository files

**Files:**
- Modify: `src/features/storage/exercise-logs.repository.ts:11-23`
- Modify: `src/features/storage/exercise-logs.repository.ts:30-31`
- Modify: `src/features/storage/daily-condition.repository.ts:15-19`
- Modify: `src/features/storage/daily-condition.repository.ts:22-23`
- Modify: `src/features/storage/daily-wellness.repository.ts:24-29`
- Modify: `src/features/storage/daily-metrics.repository.ts:12-25`
- Modify: `src/features/storage/daily-metrics.repository.ts:35-63`
- Modify: `src/features/storage/daily-self-care.repository.ts:15-43`

Each file gets:
1. An import of `scheduleSync` at the top
2. A `scheduleSync()` call after each successful IndexedDB write in every save/update/upsert/replace function

- [ ] **Step 1: Add import and scheduleSync() to exercise-logs.repository.ts**

Current top imports:
```typescript
import type { ExerciseLog } from "@/lib/types";
import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "./app-db";
```

Add import:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
```

In `saveExerciseLog()`, add after the `appDb.logs.put(...)` call inside the transaction:
```typescript
    return appDb.logs.put({
      ...input,
      id: existingLog?.id ?? crypto.randomUUID(),
      loggedAt: localIsoNow(),
    }).then((id) => {
      scheduleSync();
      return id;
    });
```

In `updateExerciseLog()`, add after `await appDb.logs.put(log)`:
```typescript
export async function updateExerciseLog(log: ExerciseLog): Promise<void> {
  await appDb.logs.put(log);
  scheduleSync();
}
```

- [ ] **Step 2: Add import and scheduleSync() to daily-condition.repository.ts**

Add import:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
```

In `saveDailyCondition()`:
```typescript
export function saveDailyCondition(input: SaveDailyConditionInput) {
  return appDb.conditions.put({
    ...input,
    updatedAt: localIsoNow(),
  }).then((key) => {
    scheduleSync();
    return key;
  });
}
```

In `updateDailyCondition()`:
```typescript
export function updateDailyCondition(entry: DailyConditionEntry): Promise<string> {
  return appDb.conditions.put(entry).then((key) => {
    scheduleSync();
    return key;
  });
}
```

- [ ] **Step 3: Add import and scheduleSync() to daily-wellness.repository.ts**

Add import:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
```

In `saveDailyWellness()`:
```typescript
export function saveDailyWellness(input: SaveDailyWellnessInput) {
  return appDb.dailyWellness.put({
    ...input,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  }).then((key) => {
    scheduleSync();
    return key;
  });
}
```

- [ ] **Step 4: Add import and scheduleSync() to daily-metrics.repository.ts**

Add import:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
```

In `upsertDailyMetric()`:
```typescript
export async function upsertDailyMetric(date: string, metric: MetricDraft) {
  return appDb.transaction("rw", appDb.dailyMetrics, async () => {
    const existing = await appDb.dailyMetrics
      .where("[date+metricType]")
      .equals([date, metric.metricType])
      .first();
    const result = await appDb.dailyMetrics.put({
      id: existing?.id ?? crypto.randomUUID(),
      date,
      ...metric,
      recordedAt: localIsoNow(),
    });
    scheduleSync();
    return result;
  });
}
```

In `replaceDailyMetrics()`, add after the `bulkAdd` call, inside the transaction:
```typescript
    await appDb.dailyMetrics.bulkAdd(
      metrics.map((metric) => ({
        id: crypto.randomUUID(),
        date,
        ...metric,
        recordedAt,
      })),
    );
    scheduleSync();
```

- [ ] **Step 5: Add import and scheduleSync() to daily-self-care.repository.ts**

Add import:
```typescript
import { scheduleSync } from "@/features/sync/auto-sync";
```

In `replaceDailySelfCareEntries()`, add after the `bulkAdd` call, inside the transaction:
```typescript
    await appDb.dailySelfCareLogs.bulkAdd(
      entries.map((entry) => ({
        id: crypto.randomUUID(),
        date,
        ...entry,
        recordedAt,
      })),
    );
    scheduleSync();
```

- [ ] **Step 6: Run existing tests to verify nothing broke**

Run: `npx vitest run src/features/storage`
Expected: PASS (15 tests)

- [ ] **Step 7: Commit**

```bash
git add src/features/storage/exercise-logs.repository.ts src/features/storage/daily-condition.repository.ts src/features/storage/daily-wellness.repository.ts src/features/storage/daily-metrics.repository.ts src/features/storage/daily-self-care.repository.ts
git commit -m "feat(sync): add scheduleSync() calls to all repository save functions"
```

---

### Task 3: Create SyncIndicator component

**Files:**
- Create: `src/features/shell/components/sync-indicator.tsx`
- Test: `src/features/shell/components/sync-indicator.test.tsx`
- Modify: `src/features/i18n/messages/en.ts` — add 3 keys
- Modify: `src/features/i18n/messages/ja.ts` — add 3 keys

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/shell/components/sync-indicator.test.tsx
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithLanguage } from "@/test/render-with-language";
import { SyncContext } from "@/features/sync/SyncProvider";
import { SyncIndicator } from "./sync-indicator";

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    status: { type: "disconnected" as const },
    signIn: vi.fn(),
    disconnect: vi.fn(),
    syncNow: vi.fn(),
    userEmail: null,
    ...overrides,
  };
}

function renderWithProviders(ctx: unknown) {
  return renderWithLanguage(
    <SyncContext.Provider value={ctx as any}>
      <SyncIndicator />
    </SyncContext.Provider>,
    { initialLanguage: "en" },
  );
}

describe("SyncIndicator", () => {
  test("shows sign-in button when disconnected", () => {
    renderWithProviders(createMockContext());
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  test("calls signIn when sign-in button clicked", async () => {
    const ctx = createMockContext();
    const user = userEvent.setup();
    renderWithProviders(ctx);
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(ctx.signIn).toHaveBeenCalledOnce();
  });

  test("shows connected state with email", () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date() },
      userEmail: "user@example.com",
    });
    renderWithProviders(ctx);
    expect(screen.getByText(/user@example\.com/)).toBeDefined();
  });

  test("shows dropdown with disconnect on click when connected", async () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date() },
      userEmail: "user@example.com",
    });
    const user = userEvent.setup();
    renderWithProviders(ctx);
    await user.click(screen.getByText(/user@example\.com/));
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeDefined();
  });

  test("calls disconnect from dropdown", async () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date() },
      userEmail: "user@example.com",
    });
    const user = userEvent.setup();
    renderWithProviders(ctx);
    await user.click(screen.getByText(/user@example\.com/));
    await user.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(ctx.disconnect).toHaveBeenCalledOnce();
  });

  test("shows syncing state", () => {
    const ctx = createMockContext({
      status: { type: "syncing", message: "Syncing..." },
    });
    renderWithProviders(ctx);
    expect(screen.getByText(/syncing/i)).toBeDefined();
  });

  test("shows error state", () => {
    const ctx = createMockContext({
      status: { type: "error", message: "Sync failed", partial: true },
    });
    renderWithProviders(ctx);
    expect(screen.getByText(/sync/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/shell/components/sync-indicator.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/shell/components/sync-indicator.tsx
"use client";

import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";

export function SyncIndicator() {
  const { status, userEmail, signIn, disconnect } = useSync();
  const { t } = useTranslation();

  if (status.type === "disconnected") {
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        title={t("sync_indicator_sign_in")}
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        🔓
      </button>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        {status.type === "syncing" ? (
          <span className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            🔄
          </span>
        ) : status.type === "error" ? (
          <span className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-destructive">
            ⚠️
          </span>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            🔒
            <span className="hidden sm:inline max-w-[100px] truncate">
              {userEmail}
            </span>
          </button>
        )}
      </DropdownTrigger>
      <DropdownContent>
        {status.type === "error" && (
          <p className="px-3 py-2 text-xs text-destructive">
            {status.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => void disconnect()}
          className="w-full px-3 py-2 text-xs font-semibold text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-md"
        >
          {t("sync_indicator_disconnect")}
        </button>
      </DropdownContent>
    </Dropdown>
  );
}

// Inline dropdown components (avoids third-party dependency for one pattern)

function Dropdown({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

function DropdownTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownContent({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[160px] rounded-lg border border-border bg-card p-2 shadow-lg">
            {children}
          </div>
        </>
      )}
    </>
  );
}
```

Wait, the Dropdown pattern needs refinement. Let me restructure it.

- [ ] **Step 3 (revised): Write the implementation with proper dropdown**

```typescript
// src/features/shell/components/sync-indicator.tsx
"use client";

import { useState, useCallback } from "react";
import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";

export function SyncIndicator() {
  const { status, userEmail, signIn, disconnect } = useSync();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (status.type === "disconnected") {
      void signIn();
    } else {
      setOpen((prev) => !prev);
    }
  }, [status.type, signIn]);

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    void disconnect();
  }, [disconnect]);

  const isConnected = status.type !== "disconnected";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={status.type === "syncing"}
        title={
          status.type === "disconnected"
            ? t("sync_indicator_sign_in")
            : status.type === "syncing"
              ? t("sync_indicator_syncing")
              : status.type === "error"
                ? t("sync_indicator_error")
                : userEmail ?? ""
        }
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {status.type === "syncing" ? (
          "🔄"
        ) : status.type === "error" ? (
          "⚠️"
        ) : isConnected ? (
          <>
            🔒
            <span className="hidden sm:inline max-w-[100px] truncate">
              {userEmail}
            </span>
          </>
        ) : (
          "🔓"
        )}
      </button>

      {open && isConnected && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[160px] rounded-lg border border-border bg-card p-2 shadow-lg">
            {status.type === "error" && (
              <p className="px-3 py-2 text-xs text-destructive">
                {status.message}
              </p>
            )}
            {userEmail && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                {userEmail}
              </p>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full rounded-md px-3 py-2 text-xs font-semibold text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t("sync_indicator_disconnect")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add i18n keys**

Add to `en.ts` (before the closing `} as const;`):
```typescript
  // Sync indicator
  sync_indicator_sign_in: "Sign in with Google",
  sync_indicator_disconnect: "Disconnect",
  sync_indicator_syncing: "Syncing...",
  sync_indicator_error: "Sync error",
```

Add to `ja.ts` (same position):
```typescript
  // Sync indicator
  sync_indicator_sign_in: "Google でログイン",
  sync_indicator_disconnect: "連携を解除",
  sync_indicator_syncing: "同期中...",
  sync_indicator_error: "同期エラー",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/shell/components/sync-indicator.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/features/shell/components/sync-indicator.tsx src/features/shell/components/sync-indicator.test.tsx src/features/i18n/messages/en.ts src/features/i18n/messages/ja.ts
git commit -m "feat(shell): add SyncIndicator component with i18n labels"
```

---

### Task 4: Wire SyncIndicator into AppShell

**Files:**
- Modify: `src/components/app-shell/app-shell.tsx` — add SyncIndicator after LanguageSwitcher

- [ ] **Step 1: Modify app-shell.tsx**

Current header section (lines 14-19):
```tsx
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
          <LanguageSwitcher />
        </div>
      </header>
```

Add import:
```typescript
import { SyncIndicator } from "@/features/shell/components/sync-indicator";
```

Change the header div to group LanguageSwitcher and SyncIndicator together:
```typescript
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <SyncIndicator />
          </div>
        </div>
      </header>
```

- [ ] **Step 2: Run existing SyncProvider tests**

Run: `npx vitest run src/features/sync/SyncProvider.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 4: Run full test suite for affected areas**

Run: `npx vitest run src/features/sync src/features/storage src/features/shell`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/app-shell.tsx
git commit -m "feat(shell): wire SyncIndicator into AppShell header"
```