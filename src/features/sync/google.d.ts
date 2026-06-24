/**
 * Ambient type declarations for the Google Identity Services (GIS) script
 * loaded dynamically at runtime from https://accounts.google.com/gsi/client.
 *
 * Only the surface used by google-auth.ts is declared. Extend as needed.
 */

declare global {
  namespace google {
    namespace accounts.oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope?: string;
        token_type?: string;
        id_token?: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
        hint?: string;
      }

      interface TokenClientOptions {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { message: string; type?: string }) => void;
        prompt?: "" | "none" | "consent" | "select_account";
        hint?: string;
        enable_serial_consent?: boolean;
        state?: string;
      }

      interface TokenClient {
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { message: string; type?: string }) => void;
        requestAccessToken: (overrides?: { prompt?: string; hint?: string }) => void;
      }

      function initTokenClient(config: TokenClientOptions): TokenClient;
    }
  }
}

export {};