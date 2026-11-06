import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { scheduleSync } from "@/features/sync/auto-sync";

import { appDb } from "./app-db";
import { getLibraryOrder, saveLibraryOrder } from "./list-orders.repository";

beforeEach(async () => {
  await appDb.listOrders.clear();
  vi.mocked(scheduleSync).mockClear();
});

test("getLibraryOrder is empty until an order is saved", async () => {
  expect(await getLibraryOrder()).toEqual([]);
});

test("saveLibraryOrder stores and overwrites the order and schedules sync", async () => {
  await saveLibraryOrder(["b", "a"]);
  expect(await getLibraryOrder()).toEqual(["b", "a"]);
  await saveLibraryOrder(["a", "b"]);
  expect(await getLibraryOrder()).toEqual(["a", "b"]);
  expect(await appDb.listOrders.count()).toBe(1);
  expect(scheduleSync).toHaveBeenCalledTimes(2);
});
