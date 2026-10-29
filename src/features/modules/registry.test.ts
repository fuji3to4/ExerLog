import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { recordModuleData } from "./data-registry";
import { getRecordModule, RECORD_MODULES } from "./registry";

describe("RECORD_MODULES", () => {
  it("uses the same data objects in the same order as recordModuleData()", () => {
    const data = recordModuleData();
    expect(RECORD_MODULES).toHaveLength(data.length);
    RECORD_MODULES.forEach((module, index) => expect(module.data).toBe(data[index]));
  });

  it("tags the lymphedema-only modules", () => {
    const tagged = RECORD_MODULES.filter((m) => m.tags?.includes("lymphedema")).map((m) => m.data.id);
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
