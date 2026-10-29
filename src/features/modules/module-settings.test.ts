import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MODULE_SETTINGS_STORAGE_KEY,
  moveModule,
  readModuleSettings,
  resolveModuleSettings,
  setModuleEnabled,
  subscribeModuleSettings,
  writeModuleSettings,
} from "./module-settings";

const IDS = ["wellness", "body", "circumference"];

beforeEach(() => {
  // A successful write clears any in-memory fallback left by a blocked-storage test.
  writeModuleSettings({ order: [], disabled: [] });
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("module settings", () => {
  it("returns registry order, all enabled, for missing or broken data", () => {
    for (const stored of [null, undefined, "x", 3, { order: "x" }]) {
      expect(resolveModuleSettings(stored, IDS)).toEqual({ order: IDS, disabled: [] });
    }
  });

  it("drops unknown ids, dedupes, appends new registry ids enabled at the end", () => {
    expect(
      resolveModuleSettings(
        { order: ["body", "ghost", "body", "wellness"], disabled: ["ghost", "body"] },
        IDS,
      ),
    ).toEqual({ order: ["body", "wellness", "circumference"], disabled: ["body"] });
  });

  it("moveModule clamps the index and setModuleEnabled toggles", () => {
    const s = { order: IDS, disabled: [] };
    expect(moveModule(s, "circumference", 0).order).toEqual(["circumference", "wellness", "body"]);
    expect(moveModule(s, "wellness", 99).order).toEqual(["body", "circumference", "wellness"]);
    expect(setModuleEnabled(s, "body", false).disabled).toEqual(["body"]);
    expect(setModuleEnabled({ order: IDS, disabled: ["body"] }, "body", true).disabled).toEqual([]);
    expect(s).toEqual({ order: IDS, disabled: [] });
  });

  it("read falls back when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readModuleSettings(IDS)).toEqual({ order: IDS, disabled: [] });
  });

  it("falls back on invalid JSON", () => {
    window.localStorage.setItem(MODULE_SETTINGS_STORAGE_KEY, "{nope");
    expect(readModuleSettings(IDS)).toEqual({ order: IDS, disabled: [] });
  });

  it("write+read round-trips and returns a stable object for unchanged data", () => {
    writeModuleSettings({ order: ["body", "wellness", "circumference"], disabled: ["wellness"] });
    const a = readModuleSettings(IDS);
    expect(a).toEqual({ order: ["body", "wellness", "circumference"], disabled: ["wellness"] });
    expect(readModuleSettings(IDS)).toBe(a);
  });

  it("writeModuleSettings notifies subscribers, even if storage fails", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeModuleSettings(listener);
    writeModuleSettings({ order: IDS, disabled: [] });
    expect(listener).toHaveBeenCalledTimes(1);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    writeModuleSettings({ order: IDS, disabled: ["body"] });
    expect(listener).toHaveBeenCalledTimes(2);
    const after = readModuleSettings(IDS);
    expect(after.disabled).toEqual(["body"]);
    expect(readModuleSettings(IDS)).toBe(after);
    unsubscribe();
    writeModuleSettings({ order: IDS, disabled: [] });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("applies default-off ids on a fresh device", () => {
    expect(resolveModuleSettings(null, IDS, ["circumference"])).toEqual({
      order: IDS,
      disabled: ["circumference"],
    });
  });

  it("treats an empty or broken order as a fresh device", () => {
    for (const stored of [{ order: [], disabled: [] }, { order: ["ghost"] }, "x"]) {
      expect(resolveModuleSettings(stored, IDS, ["circumference"]).disabled).toEqual(["circumference"]);
    }
  });

  it("keeps modules already in the stored order as stored", () => {
    expect(
      resolveModuleSettings({ order: ["circumference", "wellness"], disabled: [] }, IDS, ["circumference", "body"]),
    ).toEqual({ order: ["circumference", "wellness", "body"], disabled: ["body"] });
  });

  it("persists the first resolution so a later default change does not flip it", () => {
    expect(readModuleSettings(IDS, ["circumference"]).disabled).toEqual(["circumference"]);
    expect(JSON.parse(window.localStorage.getItem(MODULE_SETTINGS_STORAGE_KEY)!)).toEqual({
      order: IDS,
      disabled: ["circumference"],
    });
    expect(readModuleSettings(IDS, []).disabled).toEqual(["circumference"]);
  });

  it("persists when a new registry id gets its default", () => {
    window.localStorage.setItem(MODULE_SETTINGS_STORAGE_KEY, JSON.stringify({ order: ["wellness", "body"], disabled: [] }));
    readModuleSettings(IDS, ["circumference"]);
    expect(JSON.parse(window.localStorage.getItem(MODULE_SETTINGS_STORAGE_KEY)!).order).toEqual(IDS);
  });

  it("returns the same object on repeated reads after persisting", () => {
    const first = readModuleSettings(IDS, ["circumference"]);
    expect(readModuleSettings(IDS, ["circumference"])).toBe(first);
  });

  it("still applies defaults when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readModuleSettings(IDS, ["circumference"])).toEqual({ order: IDS, disabled: ["circumference"] });
  });
});
