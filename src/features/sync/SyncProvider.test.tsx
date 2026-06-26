import { describe, expect, test, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SyncProvider, useSync } from "./SyncProvider";

// Mock dependencies
vi.mock("./google-auth", () => ({
  trySilentRefresh: vi.fn(),
  requestSignIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./sync-engine", () => ({
  syncAll: vi.fn(),
}));

import { trySilentRefresh, requestSignIn, signOut } from "./google-auth";
import { syncAll } from "./sync-engine";
import type { GoogleToken } from "./google-auth";
import type { SyncAllResult, SyncTableResult } from "./sync-engine";

const FAKE_TOKEN: GoogleToken = {
  accessToken: "fake-access-token",
  expiresAt: Date.now() + 3600 * 1000,
  email: "user@example.com",
};

function makeResult(overrides: Partial<SyncAllResult> = {}): SyncAllResult {
  return {
    success: true,
    results: [],
    spreadsheetId: "sheet-1",
    ...overrides,
  };
}

function TestConsumer() {
  const { status, signIn, disconnect, syncNow, userEmail } = useSync();
  const isSyncing = status.type === "syncing";
  const isSynced = status.type === "synced";
  const isError = status.type === "error";
  const isDisconnected = status.type === "disconnected";
  return (
    <div>
      <div data-testid="status">{status.type}</div>
      <div data-testid="user-email">{userEmail ?? ""}</div>
      {isSyncing ? <div data-testid="syncing-message">{(status as { type: "syncing"; message: string }).message}</div> : null}
      {isSynced ? <div data-testid="synced-at">{(status as { type: "synced"; lastSynced: Date }).lastSynced.toISOString()}</div> : null}
      {isError ? <div data-testid="error-message">{(status as { type: "error"; message: string; partial: boolean }).message}</div> : null}
      {isDisconnected ? <div data-testid="disconnected">disconnected</div> : null}
      <button data-testid="sign-in" onClick={() => void signIn()}>
        Sign In
      </button>
      <button data-testid="disconnect" onClick={() => void disconnect()}>
        Disconnect
      </button>
      <button data-testid="sync-now" onClick={() => void syncNow()}>
        Sync Now
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SyncProvider", () => {
  test("provides disconnected status by default", () => {
    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("disconnected");
    expect(screen.getByTestId("user-email").textContent).toBe("");
  });

  test("useSync throws outside provider", () => {
    // Suppress console.error for expected React error boundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    spy.mockRestore();
  });

  test("signIn flow sets userEmail and triggers sync to synced state", async () => {
    vi.mocked(requestSignIn).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(syncAll).mockResolvedValue(makeResult());

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    fireEvent.click(screen.getByTestId("sign-in"));

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("user@example.com");
    });
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("synced");
    });
    expect(requestSignIn).toHaveBeenCalledTimes(1);
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
  });

  test("syncNow success path transitions status to synced", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(syncAll).mockResolvedValue(makeResult());

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    fireEvent.click(screen.getByTestId("sync-now"));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("synced");
    });
    expect(screen.getByTestId("synced-at").textContent).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
  });

  test("syncNow error path transitions status to error", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    const errorResults: SyncTableResult[] = [
      {
        tableName: "ExerciseLogs",
        total: 3,
        found: 1,
        appended: 0,
        error: "Permission denied",
      },
    ];
    vi.mocked(syncAll).mockResolvedValue(makeResult({ success: false, results: errorResults }));

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    fireEvent.click(screen.getByTestId("sync-now"));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
    });
    expect(screen.getByTestId("error-message").textContent).toBe(
      "ExerciseLogs: Permission denied",
    );
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "full");
  });

  test("syncNow transitions through syncing before reaching synced", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    // Defer syncAll resolution to observe intermediate state
    let resolveSync: (value: SyncAllResult) => void = () => {};
    vi.mocked(syncAll).mockImplementation(
      () => new Promise<SyncAllResult>((resolve) => {
        resolveSync = resolve;
      }),
    );

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    fireEvent.click(screen.getByTestId("sync-now"));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("syncing");
    });
    expect(screen.getByTestId("syncing-message").textContent).toBe("Starting sync...");

    resolveSync(makeResult());

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("synced");
    });
  });

  test("disconnect clears userEmail and resets status to disconnected", async () => {
    vi.mocked(signOut).mockResolvedValue();
    vi.mocked(requestSignIn).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(syncAll).mockResolvedValue(makeResult());

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    // First sign in to populate userEmail
    fireEvent.click(screen.getByTestId("sign-in"));
    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("user@example.com");
    });

    // Then disconnect
    fireEvent.click(screen.getByTestId("disconnect"));
    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("");
    });
    expect(screen.getByTestId("status").textContent).toBe("disconnected");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  test("on-mount silent refresh with valid token runs sync", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(FAKE_TOKEN);
    vi.mocked(syncAll).mockResolvedValue(makeResult());

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("synced");
    });
    expect(screen.getByTestId("user-email").textContent).toBe("user@example.com");
    expect(trySilentRefresh).toHaveBeenCalled();
    expect(syncAll).toHaveBeenCalledWith("fake-access-token", expect.any(Function), "upload-only");
  });

  test("on-mount silent refresh with no token leaves status disconnected", async () => {
    vi.mocked(trySilentRefresh).mockResolvedValue(null);

    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );

    // Give the mount effect a chance to run; status should remain disconnected
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId("status").textContent).toBe("disconnected");
    expect(screen.getByTestId("user-email").textContent).toBe("");
    expect(syncAll).not.toHaveBeenCalled();
  });
});
