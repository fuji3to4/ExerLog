"use client";

/**
 * What the library shows (selected set, sort, shuffle order), kept for the browser session so
 * the player can switch the library to シャッフル and the library is unchanged after a round trip.
 * Search and filters are deliberately not kept.
 */
export const LIBRARY_VIEW_STORAGE_KEY = "exerlog-library-view";

export type LibrarySort = "" | "most-watched" | "most-done" | "shuffle";
export type UnshuffledSort = Exclude<LibrarySort, "shuffle">;

/** `listKey` is the set id the order belongs to, "" for すべて. */
export type LibraryShuffle = { listKey: string; order: string[]; previousSort: UnshuffledSort };

export type LibraryView = { set: string; sort: LibrarySort; shuffle: LibraryShuffle | null };

export const DEFAULT_LIBRARY_VIEW: LibraryView = { set: "", sort: "", shuffle: null };

const UNSHUFFLED_SORTS: readonly string[] = ["", "most-watched", "most-done"];

export function isUnshuffledSort(value: unknown): value is UnshuffledSort {
  return typeof value === "string" && UNSHUFFLED_SORTS.includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string");
}

function parseShuffle(value: unknown): LibraryShuffle | null {
  if (typeof value !== "object" || value === null) return null;
  const { listKey, order, previousSort } = value as Partial<LibraryShuffle>;
  if (typeof listKey !== "string" || !isStringArray(order) || !isUnshuffledSort(previousSort)) return null;
  return { listKey, order, previousSort };
}

export function readLibraryView(): LibraryView {
  try {
    const raw = window.sessionStorage.getItem(LIBRARY_VIEW_STORAGE_KEY);
    if (!raw) return DEFAULT_LIBRARY_VIEW;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_LIBRARY_VIEW;
    const { set, sort, shuffle } = parsed as Record<string, unknown>;
    if (typeof set !== "string") return DEFAULT_LIBRARY_VIEW;
    if (sort === "shuffle") {
      const parsedShuffle = parseShuffle(shuffle);
      return parsedShuffle ? { set, sort, shuffle: parsedShuffle } : DEFAULT_LIBRARY_VIEW;
    }
    return isUnshuffledSort(sort) ? { set, sort, shuffle: null } : DEFAULT_LIBRARY_VIEW;
  } catch {
    return DEFAULT_LIBRARY_VIEW;
  }
}

export function writeLibraryView(view: LibraryView): void {
  try {
    window.sessionStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Storage unavailable: the library simply starts from すべて / 標準 next time.
  }
}
