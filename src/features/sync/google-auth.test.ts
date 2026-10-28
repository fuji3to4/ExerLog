import { describe, expect, test, vi, beforeEach } from "vitest";
import { appDb } from "@/features/storage/app-db";
import {
  loadStoredToken,
  storeToken,
  clearToken,
  parseTokenFromResponse,
  requestSignIn,
  trySilentRefresh,
  SILENT_REFRESH_TIMEOUT_MS,
} from "./google-auth";

beforeEach(async () => {
  await appDb.googleAuth.clear();
  vi.restoreAllMocks();
});

// Mock the GIS global at module load time. The real `google.accounts.oauth2`
// only exists once the GIS script is loaded in a browser.
const mockRequestAccessToken = vi.fn();
/** The options of the last initTokenClient call (holds the error_callback). */
let lastClientConfig: google.accounts.oauth2.TokenClientOptions | null = null;
const mockTokenClient = {
  callback: vi.fn(),
  requestAccessToken: mockRequestAccessToken,
};
vi.stubGlobal("google", {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn((config: google.accounts.oauth2.TokenClientOptions) => {
        lastClientConfig = config;
        return mockTokenClient;
      }),
    },
  },
});

describe("storeToken / loadStoredToken", () => {
  test("stores and loads token from Dexie", async () => {
    const token = { accessToken: "abc", expiresAt: Date.now() + 3600000, email: "test@example.com" };
    await storeToken(token);
    const loaded = await loadStoredToken();
    expect(loaded).not.toBeNull();
    expect(loaded!.email).toBe("test@example.com");
    expect(loaded!.accessToken).toBe("abc");
  });

  test("returns null when no token stored", async () => {
    const loaded = await loadStoredToken();
    expect(loaded).toBeNull();
  });

  test("clearToken removes stored token", async () => {
    await storeToken({ accessToken: "abc", expiresAt: Date.now() + 3600000, email: "t@t.com" });
    await clearToken();
    const loaded = await loadStoredToken();
    expect(loaded).toBeNull();
  });
});

describe("parseTokenFromResponse", () => {
  test("parses a valid GIS token response", () => {
    const response = {
      access_token: "xyz789",
      expires_in: 3600,
    };
    const now = Date.now();
    const result = parseTokenFromResponse(response, "user@example.com");
    expect(result.accessToken).toBe("xyz789");
    expect(result.email).toBe("user@example.com");
    // expiresAt should be roughly now + expires_in * 1000
    expect(result.expiresAt).toBeGreaterThan(now + 3500000);
    expect(result.expiresAt).toBeLessThan(now + 3700000);
  });
});

describe("requestSignIn", () => {
  test("fetches email from userinfo endpoint after token granted", async () => {
    const userinfoSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "real@example.com" }), {
        status: 200,
      }),
    );

    // Trigger the callback synchronously when requestAccessToken is called
    mockRequestAccessToken.mockImplementation(() => {
      mockTokenClient.callback({
        access_token: "new-token",
        expires_in: 3600,
      });
    });

    const token = await requestSignIn();

    expect(token.accessToken).toBe("new-token");
    expect(token.email).toBe("real@example.com");
    expect(userinfoSpy).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      expect.objectContaining({
        headers: { Authorization: "Bearer new-token" },
      }),
    );

    const stored = await loadStoredToken();
    expect(stored?.email).toBe("real@example.com");
  });

  test("falls back to empty email when userinfo fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("forbidden", { status: 403 }),
    );
    mockRequestAccessToken.mockImplementation(() => {
      mockTokenClient.callback({
        access_token: "new-token",
        expires_in: 3600,
      });
    });

    const token = await requestSignIn();

    expect(token.accessToken).toBe("new-token");
    expect(token.email).toBe("");
  });

  test("rejects when GIS callback receives an error", async () => {
    mockRequestAccessToken.mockImplementation(() => {
      mockTokenClient.callback({ error: "access_denied" } as any);
    });

    await expect(requestSignIn()).rejects.toThrow("access_denied");
  });
});

describe("trySilentRefresh", () => {
  test("concurrent calls share one refresh; a later call starts a new one", async () => {
    await storeToken({ accessToken: "old", expiresAt: Date.now() - 1000, email: "a@b.c" });
    mockRequestAccessToken.mockReset();
    mockRequestAccessToken.mockImplementation(() => {
      setTimeout(() => mockTokenClient.callback({ access_token: "fresh", expires_in: 3600 } as any), 0);
    });

    const [first, second] = await Promise.all([trySilentRefresh(), trySilentRefresh()]);
    expect(mockRequestAccessToken).toHaveBeenCalledTimes(1);
    expect(first?.accessToken).toBe("fresh");
    expect(second).toBe(first);

    await storeToken({ accessToken: "old", expiresAt: Date.now() - 1000, email: "a@b.c" });
    await trySilentRefresh();
    expect(mockRequestAccessToken).toHaveBeenCalledTimes(2);
  });
});

describe("trySilentRefresh never hangs", () => {
  const expired = () => ({ accessToken: "old", expiresAt: Date.now() - 1000, email: "a@b.c" });
  const lastErrorCallback = () => lastClientConfig!.error_callback!;

  test("a refresh whose callback never fires resolves to null after the timeout, keeps the token, and a later call starts a new refresh", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      await storeToken(expired());
      mockRequestAccessToken.mockReset(); // GIS never answers

      const pending = trySilentRefresh();
      await vi.waitFor(() => expect(mockRequestAccessToken).toHaveBeenCalledTimes(1));
      vi.advanceTimersByTime(SILENT_REFRESH_TIMEOUT_MS);

      expect(await pending).toBeNull();
      expect((await loadStoredToken())?.accessToken).toBe("old");

      mockRequestAccessToken.mockImplementation(() => {
        mockTokenClient.callback({ access_token: "fresh", expires_in: 3600 } as any);
      });
      expect((await trySilentRefresh())?.accessToken).toBe("fresh");
      expect(mockRequestAccessToken).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  test("error_callback settles the pending refresh with null and keeps the stored token", async () => {
    await storeToken(expired());
    mockRequestAccessToken.mockReset();
    mockRequestAccessToken.mockImplementation(() => {
      setTimeout(() => lastErrorCallback()({ type: "popup_failed_to_open", message: "Failed to open popup" }), 0);
    });

    expect(await trySilentRefresh()).toBeNull();
    expect((await loadStoredToken())?.accessToken).toBe("old");
  });

  test("error_callback rejects a pending sign-in", async () => {
    mockRequestAccessToken.mockReset();
    mockRequestAccessToken.mockImplementation(() => {
      setTimeout(() => lastErrorCallback()({ type: "popup_closed", message: "Popup window closed" }), 0);
    });

    await expect(requestSignIn()).rejects.toThrow("Popup window closed");
  });

  test("requestSignIn during an in-flight refresh settles the refresh (null) and the sign-in succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ email: "real@example.com" }), { status: 200 }),
    );
    await storeToken(expired());
    mockRequestAccessToken.mockReset(); // the silent refresh never answers

    const refresh = trySilentRefresh();
    await vi.waitFor(() => expect(mockRequestAccessToken).toHaveBeenCalledTimes(1));

    mockRequestAccessToken.mockImplementation(() => {
      mockTokenClient.callback({ access_token: "signed-in", expires_in: 3600 } as any);
    });
    const signIn = await requestSignIn();

    expect(await refresh).toBeNull();
    expect(signIn.accessToken).toBe("signed-in");
    expect((await loadStoredToken())?.accessToken).toBe("signed-in");
    // The shared refresh is released: the next call uses the new, valid token.
    expect((await trySilentRefresh())?.accessToken).toBe("signed-in");
  });

  test("a refresh started while a sign-in popup is open does not take over its callback", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await storeToken(expired());
    mockRequestAccessToken.mockReset(); // the popup stays open

    const signIn = requestSignIn();
    await vi.waitFor(() => expect(mockRequestAccessToken).toHaveBeenCalledTimes(1));

    expect(await trySilentRefresh()).toBeNull();
    expect(mockRequestAccessToken).toHaveBeenCalledTimes(1);

    mockTokenClient.callback({ access_token: "signed-in", expires_in: 3600 } as any);
    expect((await signIn).accessToken).toBe("signed-in");
  });
});