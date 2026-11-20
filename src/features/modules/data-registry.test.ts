import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { clearAllRecords } from "@/features/storage/clear-all-records";
import { appDb } from "@/features/storage/app-db";
import { sheetTabs, tableSyncConfigs } from "@/features/sync/sync-config";
import { circumferenceRepository } from "./circumference/data";
import { builtinDefinition } from "./custom/builtin";
import { addCustomRecord } from "./custom/data";
import { getModuleData, recordModuleData } from "./data-registry";

const wellnessDef = builtinDefinition("wellness");
const bodyDef = builtinDefinition("body");
const addWellness = (date: string, recordedAt = `${date}T08:00:00+09:00`) =>
  addCustomRecord(wellnessDef, { date, recordedAt, values: { physical: 3, mental: 3 }, note: "" });
const addBody = (date: string, recordedAt: string, weight: number) =>
  addCustomRecord(bodyDef, { date, recordedAt, values: { weight }, note: "" });

const P = { start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" };

beforeEach(async () => {
  await Promise.all([
    appDb.customRecords.clear(),
    appDb.circumferenceRecords.clear(),
    appDb.exerciseLogs.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("recordModuleData", () => {
  it("lists wellness, body, girth, circumference, photo, selfcare, compression, symptoms with unique ids and tab names", () => {
    const modules = recordModuleData();
    expect(modules.map((m) => m.id)).toEqual(["wellness", "body", "girth", "circumference", "photo", "selfcare", "compression", "symptoms"]);
    const tabs = modules.flatMap((m) => m.syncConfigs.map((c) => c.tabName));
    expect(tabs).toEqual(["Custom_wellness", "Custom_body", "Custom_girth", "Circumference", "Photos", "PhotoFiles", "Custom_selfcare", "Compression", "Symptoms"]);
    expect(new Set(tabs).size).toBe(tabs.length);
    expect(recordModuleData()).toBe(modules);
    expect(getModuleData("body")).toBe(modules[1]);
    expect(getModuleData("nope")).toBeUndefined();
  });

  it("feeds sync tabs in the documented order", () => {
    expect(sheetTabs()).toEqual([
      "ExerciseLogs",
      "RecordTypes",
      "Custom_wellness",
      "Custom_body",
      "Custom_girth",
      "Circumference",
      "Photos",
      "PhotoFiles",
      "Custom_selfcare",
      "Compression",
      "Symptoms",
      "WatchEvents",
      "Exercises",
      "ExerciseSets",
      "ListOrders",
      "Tombstones",
    ]);
    expect(tableSyncConfigs().map((c) => c.tabName)).toEqual(sheetTabs());
  });

  it("listInPeriod drops records outside the instants on boundary days", async () => {
    await addBody("2026-10-01", "2026-10-01T08:00:00+09:00", 60);
    const inside = await addBody("2026-10-01", "2026-10-01T10:00:00+09:00", 61);
    expect((await getModuleData("body")!.listInPeriod(P)).map((r) => r.id)).toEqual([inside.id]);
  });

  it("wellness listInPeriod and datesWithRecordsInMonth work", async () => {
    await addWellness("2026-10-01");
    const kept = await addWellness("2026-10-02");
    const wellness = getModuleData("wellness")!;
    expect((await wellness.listInPeriod(P)).map((r) => r.id)).toEqual([kept.id]);
    expect(await wellness.datesWithRecordsInMonth("2026-10")).toEqual(new Set(["2026-10-01", "2026-10-02"]));
    expect(await wellness.datesWithRecordsInMonth("2026-09")).toEqual(new Set());
  });

  it("clearAll records tombstones under each module's tab name", async () => {
    const w = await addWellness("2026-10-01");
    const b = await addBody("2026-10-01", "2026-10-01T08:00:00+09:00", 60);
    const c = await circumferenceRepository.add({ date: "2026-10-01", values: { armWristLeft: 15 }, note: "" });

    await clearAllRecords();

    const tombstones = await appDb.tombstones.toArray();
    const byTable = Object.fromEntries(tombstones.map((t) => [t.table, t.recordId]));
    expect(byTable).toEqual({ Custom_wellness: w.id, Custom_body: b.id, Circumference: c.id });
    for (const m of recordModuleData()) expect(await m.count()).toBe(0);
  });

  it("generates CSV text per module", async () => {
    await addBody("2026-10-01", "2026-10-01T08:00:00+09:00", 60);
    const body = getModuleData("body")!;
    const csv = await body.csv.generate();
    expect(csv.split("\n")[0]).toMatch(/^id,date,recordedAt,note,weight/);
    expect(body.csv.fileName).toBe("body.csv");
  });
});

describe("import cycle", () => {
  it("tableSyncConfigs works when a module data file is imported first", async () => {
    vi.resetModules();
    await import("@/features/modules/compression/data");
    const { tableSyncConfigs: fresh, syncedDbTables } = await import("@/features/sync/sync-config");
    expect(fresh().map((c) => c.tabName)).toContain("Custom_wellness");
    expect(syncedDbTables().length).toBeGreaterThan(5);
  });
});
