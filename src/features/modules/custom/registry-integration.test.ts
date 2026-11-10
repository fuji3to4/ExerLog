import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { clearAllRecords, countAllRecords } from "@/features/storage/clear-all-records";
import { syncedDbTables, tableSyncConfigs } from "@/features/sync/sync-config";
import { getModuleData, recordModuleData } from "../data-registry";
import { getRecordModule, recordModules } from "../registry";
import { useDeletedCustomTypes, useModuleSettings } from "../use-module-settings";
import { addCustomRecord } from "./data";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import { loadCustomTypes, markTypeDeleted, saveImportedDefinition } from "./type-store";

function def(id: string): CustomRecordDefinition {
  const r = parseDefinition({
    exerlogRecordType: 1,
    id,
    name: id,
    fields: [{ id: "amount", label: "Amount", type: "number" }],
  });
  if (!r.ok) throw new Error("bad fixture");
  return r.definition;
}

const protein = def("protein");
const meal = def("meal");

beforeEach(async () => {
  await Promise.all(appDb.tables.map((table) => table.clear()));
  await loadCustomTypes();
  window.localStorage.clear();
});

describe("registry with custom record types", () => {
  it("appends an imported type with the same data object in both registries", async () => {
    await saveImportedDefinition(protein);
    const modules = recordModules();
    const data = recordModuleData();
    expect(modules.at(-1)?.data.id).toBe("custom:protein");
    expect(modules.at(-1)?.data).toBe(data.at(-1));
    expect(getModuleData("custom:protein")).toBe(data.at(-1));
    // Stable while the types are unchanged.
    expect(recordModules()).toBe(modules);
    expect(recordModuleData()).toBe(data);
  });

  it("reuses a custom module object while its definition is unchanged", async () => {
    await saveImportedDefinition(protein);
    const first = getRecordModule("custom:protein");
    await saveImportedDefinition(meal);
    expect(getRecordModule("custom:protein")).toBe(first);
    expect(getRecordModule("custom:meal")).toBeDefined();
  });

  it("includes deleted types in data operations", async () => {
    await saveImportedDefinition(protein);
    const record = await addCustomRecord(protein, {
      date: "2026-11-10",
      recordedAt: "2026-11-10T08:00:00+09:00",
      values: { amount: 20 },
      note: "",
    });
    await markTypeDeleted("protein", true);

    expect(recordModuleData().map((m) => m.id)).toContain("custom:protein");
    expect(getRecordModule("custom:protein")?.hidden).toBe(true);
    expect(getRecordModule("custom:protein")?.data).toBe(getModuleData("custom:protein"));
    expect(await countAllRecords()).toBe(1);

    await clearAllRecords();
    expect(await appDb.customRecords.count()).toBe(0);
    const tombstones = await appDb.tombstones.where("table").equals("Custom_protein").toArray();
    expect(tombstones.map((t) => t.recordId)).toEqual([record.id]);

    const tabs = tableSyncConfigs().map((c) => c.tabName);
    expect(tabs).toContain("Custom_protein");
    expect(tabs).toContain("RecordTypes");
    expect(tabs.indexOf("RecordTypes")).toBeLessThan(tabs.indexOf("WellnessEntries"));
  });

  it("does not list the same table twice in syncedDbTables()", async () => {
    await saveImportedDefinition(protein);
    await saveImportedDefinition(meal);
    const names = syncedDbTables().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("customRecords");
    expect(names).toContain("customRecordTypes");
  });

  it("updates settings entries when types load and leaves deleted ones out", async () => {
    const { result } = renderHook(() => ({ settings: useModuleSettings(), deleted: useDeletedCustomTypes() }));
    expect(result.current.settings.entries.map((e) => e.module.data.id)).not.toContain("custom:protein");

    await act(() => saveImportedDefinition(protein));
    expect(result.current.settings.entries.at(-1)?.module.data.id).toBe("custom:protein");
    expect(result.current.deleted).toEqual([]);

    await act(() => markTypeDeleted("protein", true));
    expect(result.current.settings.entries.map((e) => e.module.data.id)).not.toContain("custom:protein");
    expect(result.current.settings.settings.order).toContain("custom:protein");
    expect(result.current.deleted.map((t) => t.id)).toEqual(["protein"]);
  });
});
