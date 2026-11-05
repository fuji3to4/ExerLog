import { beforeEach, expect, test } from "vitest";

import { PLAYLIST_SETTINGS_STORAGE_KEY, readPlaylistSettings, writePlaylistSettings } from "./playlist-settings-store";

beforeEach(() => {
  window.localStorage.removeItem(PLAYLIST_SETTINGS_STORAGE_KEY);
});

test("defaults to loop and auto-check off", () => {
  expect(readPlaylistSettings()).toEqual({ loop: false, autoCheck: false });
});

test("round-trips what was written", () => {
  writePlaylistSettings({ loop: true, autoCheck: true });
  expect(window.localStorage.getItem(PLAYLIST_SETTINGS_STORAGE_KEY)).not.toBeNull();
  expect(readPlaylistSettings()).toEqual({ loop: true, autoCheck: true });
});

test("invalid stored JSON falls back to defaults", () => {
  window.localStorage.setItem(PLAYLIST_SETTINGS_STORAGE_KEY, "{not json");
  expect(readPlaylistSettings()).toEqual({ loop: false, autoCheck: false });
});
