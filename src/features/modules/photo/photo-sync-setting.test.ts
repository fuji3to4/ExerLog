import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PHOTO_SYNC_STORAGE_KEY,
  readPhotoSyncEnabled,
  usePhotoSyncEnabled,
  writePhotoSyncEnabled,
} from "./photo-sync-setting";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("photo sync setting", () => {
  it("defaults to on, persists off/on, and tolerates storage errors", () => {
    expect(PHOTO_SYNC_STORAGE_KEY).toBe("lymly-photo-sync");
    expect(readPhotoSyncEnabled()).toBe(true);

    writePhotoSyncEnabled(false);
    expect(window.localStorage.getItem("lymly-photo-sync")).toBe("off");
    expect(readPhotoSyncEnabled()).toBe(false);

    writePhotoSyncEnabled(true);
    expect(window.localStorage.getItem("lymly-photo-sync")).toBe("on");
    expect(readPhotoSyncEnabled()).toBe(true);

    window.localStorage.setItem("lymly-photo-sync", "garbage");
    expect(readPhotoSyncEnabled()).toBe(true);

    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPhotoSyncEnabled()).toBe(true);
    getItem.mockRestore();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writePhotoSyncEnabled(false)).not.toThrow();
    // The change still applies within this tab.
    expect(readPhotoSyncEnabled()).toBe(false);
    vi.restoreAllMocks();
    writePhotoSyncEnabled(true);
    expect(readPhotoSyncEnabled()).toBe(true);
  });

  it("usePhotoSyncEnabled re-renders on change", () => {
    const { result } = renderHook(() => usePhotoSyncEnabled());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(readPhotoSyncEnabled()).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });
});
