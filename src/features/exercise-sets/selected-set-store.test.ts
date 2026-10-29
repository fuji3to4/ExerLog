import { afterEach, expect, test, vi } from "vitest";

import { readSelectedSetId, writeSelectedSetId } from "./selected-set-store";

afterEach(() => {
  vi.restoreAllMocks();
});

test("returns null when nothing has been saved", () => {
  expect(readSelectedSetId()).toBeNull();
});

test("remembers the selected set id and forgets it when written null", () => {
  writeSelectedSetId("s1");
  expect(readSelectedSetId()).toBe("s1");

  writeSelectedSetId(null);
  expect(readSelectedSetId()).toBeNull();
});

test("returns null when storage throws on read", () => {
  writeSelectedSetId("s1");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readSelectedSetId()).toBeNull();
});
