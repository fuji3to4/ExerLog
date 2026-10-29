export const RESHUFFLE_STORAGE_KEY = "exerlog-recommendation-reshuffle";

type StoredReshuffle = { date: string; count: number };

/**
 * How many times today's recommendations were reshuffled on this device. Kept only in the
 * browser: losing it (another device, cleared data) just brings back the day's first set.
 */
export function readReshuffle(dayKey: string): number {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RESHUFFLE_STORAGE_KEY) ?? "null") as StoredReshuffle | null;
    return stored?.date === dayKey && Number.isInteger(stored.count) && stored.count > 0 ? stored.count : 0;
  } catch {
    return 0;
  }
}

export function writeReshuffle(dayKey: string, count: number): void {
  try {
    window.localStorage.setItem(RESHUFFLE_STORAGE_KEY, JSON.stringify({ date: dayKey, count } satisfies StoredReshuffle));
  } catch {
    // Storage unavailable: the reshuffle still applies until the page is reloaded.
  }
}
