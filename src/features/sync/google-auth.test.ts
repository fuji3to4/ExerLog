import { describe, expect, test, vi, beforeEach } from "vitest";
import { appDb } from "@/features/storage/app-db";
import {
  GOOGLE_CLIENT_ID,
  loadStoredToken,
  storeToken,
  clearToken,
  parseTokenFromResponse,
} from "./google-auth";

beforeEach(async () => {
  await appDb.googleAuth.clear();
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