export const SELECTED_SET_STORAGE_KEY = "exerlog-today-selected-set";

/**
 * Which exercise set was picked for today on this device. Kept only in the browser: losing it
 * (another device, cleared data) just falls back to the recommended set.
 */
export function readSelectedSetId(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_SET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Passing `null` forgets the choice, so the recommended set is shown again. */
export function writeSelectedSetId(id: string | null): void {
  try {
    if (id === null) {
      window.localStorage.removeItem(SELECTED_SET_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SELECTED_SET_STORAGE_KEY, id);
    }
  } catch {
    // Storage unavailable: the choice still applies until the page is reloaded.
  }
}
