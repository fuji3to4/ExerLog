import { expect, test } from "vitest";

import type { ListOrder } from "@/lib/types";

import { tableSyncConfigs } from "./sync-config";

const config = tableSyncConfigs().find((c) => c.tabName === "ListOrders")!;

test("ListOrders is synced, not deletable, before Tombstones", () => {
  const names = tableSyncConfigs().map((c) => c.tabName);
  expect(config.deletable).toBe(false);
  expect(names.indexOf("ListOrders")).toBeLessThan(names.indexOf("Tombstones"));
});

test("toRow and fromRow round-trip", () => {
  const order: ListOrder = { id: "all", exerciseIds: ["b", "a"], updatedAt: "u" };
  expect(config.fromRow(config.toRow(order, config.headers), config.headers)).toEqual(order);
});

test("fromRow falls back to [] for blank or broken exerciseIds", () => {
  expect(config.fromRow(["all", "", "u"], config.headers).exerciseIds).toEqual([]);
  expect(config.fromRow(["all", "not json", "u"], config.headers).exerciseIds).toEqual([]);
});
