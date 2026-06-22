import { describe, expect, test, vi, beforeEach } from "vitest";
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

  test("closes dropdown on Escape key", async () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date() },
      userEmail: "user@example.com",
    });
    const user = userEvent.setup();
    renderWithProviders(ctx);
    await user.click(screen.getByText(/user@example\.com/));
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: /disconnect/i })).toBeNull();
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
      status: { type: "syncing" },
    });
    renderWithProviders(ctx);
    const btn = screen.getByRole("button", { name: /syncing/i });
    expect(btn).toBeDefined();
    expect(btn).toBeDisabled();
  });

  test("shows error state", () => {
    const ctx = createMockContext({
      status: { type: "error", message: "Sync failed" },
    });
    renderWithProviders(ctx);
    expect(screen.getByRole("button", { name: /sync error/i })).toBeDefined();
  });
});