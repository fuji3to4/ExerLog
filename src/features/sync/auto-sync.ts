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
    const token = await trySilentRefresh();
    if (!token) return;
    await syncAll(token.accessToken, () => {});
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Cancel any pending timer and sync immediately.
 * Used on page load to flush unsent data.
 */
export async function syncIfNeeded(): Promise<void> {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  const token = await trySilentRefresh();
  if (!token) return;
  await syncAll(token.accessToken, () => {});
}