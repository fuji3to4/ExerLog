import { expect, test } from "vitest";

import { applyOrder, shuffleIds } from "./list-order";

const v = (id: string) => ({ id });

test("applyOrder puts ordered ids first, skips unknown ids, appends the rest", () => {
  expect(applyOrder([v("a"), v("b"), v("c"), v("d")], ["c", "x", "a", "c"]).map((i) => i.id)).toEqual([
    "c",
    "a",
    "b",
    "d",
  ]);
});

test("applyOrder with an empty order keeps input order", () => {
  expect(applyOrder([v("b"), v("a")], []).map((i) => i.id)).toEqual(["b", "a"]);
});

test("shuffleIds is a permutation and honours first", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const out = shuffleIds(ids, { first: "c", random: () => 0.3 });
  expect(out[0]).toBe("c");
  expect([...out].sort()).toEqual(ids);
});

test("shuffleIds ignores a first id that is not in the list", () => {
  expect([...shuffleIds(["a", "b"], { first: "z" })].sort()).toEqual(["a", "b"]);
});
