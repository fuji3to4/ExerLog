import { expect, test } from "vitest";

import { asEntries, exerciseIdOfEntry, toEntryKeys, withoutEntry } from "./list-entries";

test("later occurrences get #n keys, first stays the plain id", () => {
  expect(toEntryKeys(["a", "b", "a", "a"])).toEqual(["a", "b", "a#2", "a#3"]);
  expect(exerciseIdOfEntry("a#3")).toBe("a");
  expect(exerciseIdOfEntry("a")).toBe("a");
});

test("asEntries keys each exercise by its own id", () => {
  expect(asEntries([{ id: "a" }, { id: "b" }] as never).map((e) => e.entryKey)).toEqual(["a", "b"]);
});

test("withoutEntry drops a key and renumbers the later copies of that video", () => {
  expect(withoutEntry(["a#2", "b", "a", "a#3"], "a")).toEqual(["a", "b", "a#2"]);
  expect(withoutEntry(["a", "b", "a#2"], "a#2")).toEqual(["a", "b"]);
  expect(withoutEntry(["a", "b"], "b")).toEqual(["a"]);
});
