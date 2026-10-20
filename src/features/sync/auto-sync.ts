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
    try {
      const token = await trySilentRefresh();
      if (!token) return;
      await syncAll(token.accessToken, () => {});
    } catch (err) {
      console.error("[auto-sync] scheduleSync failed", err);
    }
  }, SYNC_DEBOUNCE_MS);
}

export type SyncIfNeededOutcome = "not-connected" | "synced" | "failed";

/**
 * Cancel any pending timer and sync immediately (no-op without a Google token).
 * Used before offering the starter exercise seed, so a fresh device first pulls
 * the remote library instead of overwriting it.
 */
export async function syncIfNeeded(): Promise<SyncIfNeededOutcome> {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const token = await trySilentRefresh();
  if (!token) return "not-connected";
  const result = await syncAll(token.accessToken, () => {});
  return result.success ? "synced" : "failed";
}
