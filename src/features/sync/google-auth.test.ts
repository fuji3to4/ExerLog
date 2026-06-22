import { describe, expect, test, vi, beforeEach } from "vitest";
import { appDb } from "@/features/storage/app-db";
import {
  loadStoredToken,
  storeToken,
  clearToken,
  parseTokenFromResponse,
  requestSignIn,
} from "./google-auth";

beforeEach(async () => {
  await appDb.googleAuth.clear();
  vi.restoreAllMocks();
});

// Mock the GIS global at module load time. The real `google.accounts.oauth2`
// only exists once the GIS script is loaded in a browser.
const mockRequestAccessToken = vi.fn();
const mockTokenClient = {
  callback: vi.fn(),
  requestAccessToken: mockRequestAccessToken,
};
vi.stubGlobal("google", {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(() => mockTokenClient),
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