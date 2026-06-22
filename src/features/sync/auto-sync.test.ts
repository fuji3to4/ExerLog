import { describe, expect, test, vi, beforeEach } from "vitest";
import { scheduleSync, syncIfNeeded, SYNC_DEBOUNCE_MS } from "./auto-sync";

// Mock dependencies — use vi.hoisted so they're available when vi.mock factory runs
const mockTrySilentRefresh = vi.hoisted(() => vi.fn());
const mockSyncAll = vi.hoisted(() => vi.fn());

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

  test("handles errors from trySilentRefresh gracefully", async () => {
    mockTrySilentRefresh.mockRejectedValue(new Error("network error"));

    scheduleSync();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);

    // Should not throw — error is caught by try/catch in scheduleSync
    await vi.waitFor(() => {
      expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncAll).not.toHaveBeenCalled();
  });

  test("handles errors from syncAll gracefully", async () => {
    mockTrySilentRefresh.mockResolvedValue({ accessToken: "tok" });
    mockSyncAll.mockRejectedValue(new Error("api error"));

    scheduleSync();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS);

    await vi.waitFor(() => {
      expect(mockTrySilentRefresh).toHaveBeenCalledTimes(1);
    });
    expect(mockSyncAll).toHaveBeenCalledWith("tok", expect.any(Function));
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