import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncContext } from "@/features/sync/SyncProvider";
import { renderWithLanguage } from "@/test/render-with-language";
import { GoogleDriveSettings } from "./google-drive-settings";

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
      <GoogleDriveSettings />
    </SyncContext.Provider>,
    { initialLanguage: "en" },
  );
}

describe("GoogleDriveSettings", () => {
  test("shows sign-in button when disconnected", () => {
    const ctx = createMockContext();
    renderWithProviders(ctx);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  test("calls signIn when button clicked", async () => {
    const ctx = createMockContext();
    const user = userEvent.setup();
    renderWithProviders(ctx);
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(ctx.signIn).toHaveBeenCalledOnce();
  });

  test("shows connected state with email", () => {
    const ctx = createMockContext({
      status: { type: "synced", lastSynced: new Date("2026-06-22T10:00:00") },
      userEmail: "user@gmail.com",
    });
    renderWithProviders(ctx);
    expect(screen.getByText((_, element) => element?.textContent === "✅ user@gmail.com")).toBeDefined();
    expect(screen.getByRole("button", { name: /sync now/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeDefined();
  });

  test("shows syncing state", () => {
    const ctx = createMockContext({
      status: { type: "syncing", message: "Syncing ExerciseLogs..." },
    });
    renderWithProviders(ctx);
    expect(screen.getByText(/syncing/i)).toBeDefined();
  });
});