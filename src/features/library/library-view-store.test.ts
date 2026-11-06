import { beforeEach, expect, test } from "vitest";

import {
  DEFAULT_LIBRARY_VIEW,
  LIBRARY_VIEW_STORAGE_KEY,
  readLibraryView,
  writeLibraryView,
  type LibraryView,
} from "./library-view-store";

beforeEach(() => {
  window.sessionStorage.removeItem(LIBRARY_VIEW_STORAGE_KEY);
});

test("reads the default view when nothing is stored", () => {
  expect(readLibraryView()).toEqual(DEFAULT_LIBRARY_VIEW);
  expect(DEFAULT_LIBRARY_VIEW).toEqual({ set: "", sort: "", shuffle: null });
});

test("round-trips a shuffled view", () => {
  const view: LibraryView = { set: "s1", sort: "shuffle", shuffle: { listKey: "s1", order: ["b", "a"], previousSort: "most-done" } };
  writeLibraryView(view);
  expect(readLibraryView()).toEqual(view);
});

test.each([
  ["junk JSON", "{oops"],
  ["shuffle sort without a shuffle", JSON.stringify({ set: "", sort: "shuffle", shuffle: null })],
  ["unknown sort", JSON.stringify({ set: "", sort: "newest", shuffle: null })],
  ["bad order", JSON.stringify({ set: "", sort: "shuffle", shuffle: { listKey: "", order: [1], previousSort: "" } })],
])("%s reads as the default view", (_label, raw) => {
  window.sessionStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, raw);
  expect(readLibraryView()).toEqual(DEFAULT_LIBRARY_VIEW);
});
