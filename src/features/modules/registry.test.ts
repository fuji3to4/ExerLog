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

  it("finds a module by id", () => {
    expect(getRecordModule("body")?.data.id).toBe("body");
    expect(getRecordModule("unknown")).toBeUndefined();
  });
});
