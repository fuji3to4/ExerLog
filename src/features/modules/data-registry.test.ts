import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { clearAllRecords } from "@/features/storage/clear-all-records";
import { appDb } from "@/features/storage/app-db";
import { sheetTabs, tableSyncConfigs } from "@/features/sync/sync-config";
import { bodyData, bodyRepository } from "./body/data";
import { circumferenceRepository } from "./circumference/data";
import { getModuleData, recordModuleData } from "./data-registry";
import { addWellnessEntry } from "./wellness/data";

const P = { start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" };

beforeEach(async () => {
  await Promise.all([
    appDb.wellnessEntries.clear(),
    appDb.bodyRecords.clear(),
    appDb.circumferenceRecords.clear(),
    appDb.exerciseLogs.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("recordModuleData", () => {
  it("lists wellness, body, circumference with unique ids and tab names", () => {
    const modules = recordModuleData();
    expect(modules.map((m) => m.id)).toEqual(["wellness", "body", "circumference"]);
    const tabs = modules.flatMap((m) => m.syncConfigs.map((c) => c.tabName));
    expect(tabs).toEqual(["WellnessEntries", "BodyMeasurements", "Circumference"]);
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(recordModuleData()).toBe(modules);
    expect(getModuleData("body")).toBe(bodyData);
    expect(getModuleData("nope")).toBeUndefined();
  });

  it("feeds sync tabs in the documented order", () => {
    expect(sheetTabs()).toEqual([
      "ExerciseLogs",
      "WellnessEntries",
      "BodyMeasurements",
      "Circumference",
      "WatchEvents",
      "DailySelfCare",
      "Exercises",
      "SelfCareCatalog",
      "Tombstones",
    ]);
    expect(tableSyncConfigs().map((c) => c.tabName)).toEqual(sheetTabs());
  });

  it("listInPeriod drops records outside the instants on boundary days", async () => {
    await bodyRepository.add({ date: "2026-10-01", recordedAt: "2026-10-01T08:00:00+09:00", values: { weight: 60 }, note: "" });
    const inside = await bodyRepository.add({
      date: "2026-10-01",
      recordedAt: "2026-10-01T10:00:00+09:00",
      values: { weight: 61 },
      note: "",
    });
    expect((await bodyData.listInPeriod(P)).map((r) => r.id)).toEqual([inside.id]);
  });

  it("wellness listInPeriod and datesWithRecordsInMonth work", async () => {
    await addWellnessEntry({ date: "2026-10-01", recordedAt: "2026-10-01T08:00:00+09:00", physicalScore: 3, mentalScore: 3, note: "" });
    const kept = await addWellnessEntry({
      date: "2026-10-02",
      recordedAt: "2026-10-02T08:00:00+09:00",
      physicalScore: 3,
      mentalScore: 3,
      note: "",
    });
    const wellness = getModuleData("wellness")!;
    expect((await wellness.listInPeriod(P)).map((r) => r.id)).toEqual([kept.id]);
    expect(await wellness.datesWithRecordsInMonth("2026-10")).toEqual(new Set(["2026-10-01", "2026-10-02"]));
    expect(await wellness.datesWithRecordsInMonth("2026-09")).toEqual(new Set());
  });

  it("clearAll records tombstones under each module's tab name", async () => {
    const w = await addWellnessEntry({ date: "2026-10-01", physicalScore: 3, mentalScore: 3, note: "" });
    const b = await bodyRepository.add({ date: "2026-10-01", values: { weight: 60 }, note: "" });
    const c = await circumferenceRepository.add({ date: "2026-10-01", values: { armWristLeft: 15 }, note: "" });

    await clearAllRecords();

    const tombstones = await appDb.tombstones.toArray();
    const byTable = Object.fromEntries(tombstones.map((t) => [t.table, t.recordId]));
    expect(byTable).toEqual({ WellnessEntries: w.id, BodyMeasurements: b.id, Circumference: c.id });
    for (const m of recordModuleData()) expect(await m.count()).toBe(0);
  });

  it("generates CSV text per module", async () => {
    await bodyRepository.add({ date: "2026-10-01", values: { weight: 60 }, note: "" });
    const csv = await bodyData.csv.generate();
    expect(csv.split("\n")[0]).toMatch(/^date,recordedAt,note,/);
    expect(bodyData.csv.fileName).toBe("body.csv");
  });
});

describe("import cycle", () => {
  it("tableSyncConfigs works when a module data file is imported first", async () => {
    vi.resetModules();
    await import("@/features/modules/wellness/data");
    const { tableSyncConfigs: fresh, syncedDbTables } = await import("@/features/sync/sync-config");
    expect(fresh().map((c) => c.tabName)).toContain("WellnessEntries");
    expect(syncedDbTables().length).toBeGreaterThan(5);
  });
});
