import { appDb } from "@/features/storage/app-db";

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
  email: string;
}

const TOKEN_KEY = "google_oauth_token";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export function parseTokenFromResponse(
  response: google.accounts.oauth2.TokenResponse,
  email: string,
): GoogleToken {
  return {
    accessToken: response.access_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    email,
  };
}

export async function storeToken(token: GoogleToken): Promise<void> {
  await appDb.googleAuth.put({ key: TOKEN_KEY, value: JSON.stringify(token) });
}

export async function loadStoredToken(): Promise<GoogleToken | null> {
  const entry = await appDb.googleAuth.get(TOKEN_KEY);
  if (!entry) return null;
  try {
    return JSON.parse(entry.value) as GoogleToken;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  await appDb.googleAuth.delete(TOKEN_KEY);
}

/** Dynamically load the GIS script. Returns a promise that resolves when loaded. */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load GIS script"));
    document.head.appendChild(script);
  });
}

/** Initialize the token client (loads GIS if needed). Must be called from user gesture context. */
export async function initTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;
  await loadGisScript();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // Callback is set per-request via requestAccessToken
  });
  return tokenClient;
}

/**
 * Fetch the user's email address from Google's userinfo endpoint.
 * Requires the `userinfo.email` scope and a valid access token.
 */
async function fetchUserEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { email?: string };
    return data.email ?? "";
  } catch {
    return "";
  }
}

/** Open sign-in popup. Returns the token on success. */
export async function requestSignIn(): Promise<GoogleToken> {
  const client = await initTokenClient();
  const token = await new Promise<GoogleToken>((resolve, reject) => {
    client.callback = async (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      const parsed = parseTokenFromResponse(response, "");
      await storeToken(parsed);
      resolve(parsed);
    };
    client.requestAccessToken();
  });
  // Fetch the user's email now that we have a token (best-effort)
  const email = await fetchUserEmail(token.accessToken);
  const withEmail: GoogleToken = { ...token, email };
  await storeToken(withEmail);
  tokenClient = null; // Reset so next sign-in gets fresh client
  return withEmail;
}

/** Sign out: clear stored token. GIS doesn't revoke tokens via client-side, just remove our copy. */
export async function signOut(): Promise<void> {
  await clearToken();
  tokenClient = null;
}

/** Attempt silent token refresh if we have a stored token. Returns token or null. */
export async function trySilentRefresh(): Promise<GoogleToken | null> {
  const stored = await loadStoredToken();
  if (!stored) return null;

  // If token is still valid (>5 min remaining), use it as-is
  if (stored.expiresAt > Date.now() + 300000) {
    return stored;
  }

  // Try silent refresh via GIS
  try {
    const client = await initTokenClient();
    const refreshed = await new Promise<GoogleToken>((resolve, reject) => {
      client.callback = async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const parsed = parseTokenFromResponse(response, stored.email);
        await storeToken(parsed);
        resolve(parsed);
      };
      client.requestAccessToken({ prompt: "none", hint: stored.email });
    });
    return refreshed;
  } catch {
    await clearToken();
    return null;
  }
}

/** Check if a stored token exists and is not expired (within 5-minute buffer). */
export async function hasValidToken(): Promise<boolean> {
  const token = await loadStoredToken();
  return token !== null && token.expiresAt > Date.now() + 300000;
}