import { expect, test } from "vitest";

import type { ExerciseSet } from "@/lib/types";

import { tableSyncConfigs } from "./sync-config";

const config = tableSyncConfigs().find((c) => c.tabName === "ExerciseSets")!;
const row = (ids: string) => ["s", "朝用", ids, "c", "u"];

test("fromRow parses exerciseIds JSON and falls back to []", () => {
  expect(config.fromRow(row('["a","b"]'), config.headers).exerciseIds).toEqual(["a", "b"]);
  expect(config.fromRow(row(""), config.headers).exerciseIds).toEqual([]);
  expect(config.fromRow(row("not json"), config.headers).exerciseIds).toEqual([]);
  expect(config.fromRow(row('{"a":1}'), config.headers).exerciseIds).toEqual([]);
});

test("toRow and fromRow round-trip", () => {
  const set: ExerciseSet = { id: "s", name: "朝用", exerciseIds: ["a", "b"], createdAt: "c", updatedAt: "u" };
  expect(config.fromRow(config.toRow(set), config.headers)).toEqual(set);
});
