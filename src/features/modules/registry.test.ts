import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { builtinDefinition } from "./custom/builtin";
import { parseDefinition } from "./custom/definition";
import { loadCustomTypes, saveImportedDefinition } from "./custom/type-store";
import { recordModuleData } from "./data-registry";
import { getRecordModule, recordModules } from "./registry";

const FIXED_ORDER = ["wellness", "body", "girth", "circumference", "photo", "selfcare", "compression", "symptoms"];

describe("recordModules", () => {
  it("uses the same data objects in the same order as recordModuleData()", () => {
    const data = recordModuleData();
    expect(recordModules()).toHaveLength(data.length);
    recordModules().forEach((module, index) => expect(module.data).toBe(data[index]));
  });

  it("tags the lymphedema-only modules", () => {
    const tagged = recordModules().filter((m) => m.tags?.includes("lymphedema")).map((m) => m.data.id);
    expect(tagged).toEqual(["selfcare", "compression", "symptoms"]);
  });

  it("does not tag girth, so it starts ON in every build", () => {
    expect(getRecordModule("girth")?.tags).toBeUndefined();
  });

  it("finds a module by id", () => {
    expect(getRecordModule("body")?.data.id).toBe("body");
    expect(getRecordModule("unknown")).toBeUndefined();
  });
});

describe("built-in modules", () => {
  beforeEach(async () => {
    await Promise.all(appDb.tables.map((table) => table.clear()));
  });

  it("lists the built-in and code modules first in the fixed order, before the store loads", () => {
    expect(recordModules().map((m) => m.data.id).slice(0, 8)).toEqual(FIXED_ORDER);
  });

  it("keeps the fixed order once the store has loaded", async () => {
    await loadCustomTypes();
    expect(recordModules().map((m) => m.data.id)).toEqual(FIXED_ORDER);
    expect(recordModuleData().map((m) => m.id)).toEqual(FIXED_ORDER);
  });

  it("are custom records under their own ids, untagged except selfcare", () => {
    expect(getRecordModule("selfcare")?.tags).toEqual(["lymphedema"]);
    expect(getRecordModule("wellness")?.isCustom).toBeFalsy();
    expect(getRecordModule("wellness")?.hidden).toBe(false);
    for (const id of ["wellness", "body", "selfcare", "girth"]) {
      expect(getRecordModule(id)?.data.syncConfigs.map((c) => c.tabName)).toEqual([`Custom_${id}`]);
    }
  });

  it("share data objects with recordModuleData() at the same position", async () => {
    await loadCustomTypes();
    const data = recordModuleData();
    recordModules().forEach((module, index) => expect(module.data).toBe(data[index]));
  });

  it("follow a customized definition in the store", async () => {
    await loadCustomTypes();
    const shipped = builtinDefinition("wellness");
    const parsed = parseDefinition({
      ...shipped,
      fields: [...shipped.fields, { id: "appetite", label: "Appetite", type: "number" }],
    });
    if (!parsed.ok) throw new Error("bad fixture");
    await saveImportedDefinition(parsed.definition);
    const ids = recordModules().map((m) => m.data.id);
    expect(ids).toEqual(FIXED_ORDER);
    expect(ids).not.toContain("custom:wellness");
    const csv = await getRecordModule("wellness")!.data.csv.generate();
    expect(csv.split("\n")[0]).toContain("appetite");
  });
});
