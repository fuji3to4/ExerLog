import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { girthData, girthRepository } from "./data";

beforeEach(async () => {
  await Promise.all([appDb.girthRecords.clear(), appDb.tombstones.clear()]);
});

describe("girth data", () => {
  it("lists a record that has only one item", async () => {
    const rec = await girthRepository.add({ date: "2026-10-28", values: { chest: 92.5 }, note: "" });
    const list = await girthData.listForDay("2026-10-28");
    expect(list.map((r) => r.id)).toEqual([rec.id]);
  });

  it("csv header has chest and waist columns", async () => {
    const csv = await girthData.csv.generate();
    const header = csv.split(/\r?\n/)[0].split(",");
    expect(header).toContain("chest");
    expect(header).toContain("waist");
  });

  it("clearAll empties the table and leaves tombstones", async () => {
    await girthRepository.add({ date: "2026-10-28", values: { waist: 80 }, note: "" });
    await girthData.clearAll();
    expect(await girthData.count()).toBe(0);
    const tombs = await appDb.tombstones.toArray();
    expect(tombs.some((t) => t.table === "Girth")).toBe(true);
  });

  it("syncs a single Girth tab", () => {
    expect(girthData.syncConfigs.map((c) => c.tabName)).toEqual(["Girth"]);
  });
});
