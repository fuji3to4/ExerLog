import { expect, test } from "vitest";

import { asEntries, exerciseIdOfEntry, toEntryKeys } from "./list-entries";

test("later occurrences get #n keys, first stays the plain id", () => {
  expect(toEntryKeys(["a", "b", "a", "a"])).toEqual(["a", "b", "a#2", "a#3"]);
  expect(exerciseIdOfEntry("a#3")).toBe("a");
  expect(exerciseIdOfEntry("a")).toBe("a");
});

test("asEntries keys each exercise by its own id", () => {
  expect(asEntries([{ id: "a" }, { id: "b" }] as never).map((e) => e.entryKey)).toEqual(["a", "b"]);
});
