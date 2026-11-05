import { beforeEach, expect, test } from "vitest";

import { PLAYLIST_SETTINGS_STORAGE_KEY, readPlaylistSettings, writePlaylistSettings } from "./playlist-settings-store";

beforeEach(() => {
  window.localStorage.removeItem(PLAYLIST_SETTINGS_STORAGE_KEY);
});

test("defaults to loop and auto-check off", () => {
  expect(readPlaylistSettings()).toEqual({ continuous: false, loop: false, autoCheck: false });
});

test("round-trips what was written", () => {
  writePlaylistSettings({ continuous: true, loop: true, autoCheck: true });
  expect(window.localStorage.getItem(PLAYLIST_SETTINGS_STORAGE_KEY)).not.toBeNull();
  expect(readPlaylistSettings()).toEqual({ continuous: true, loop: true, autoCheck: true });
});

test("invalid stored JSON falls back to defaults", () => {
  window.localStorage.setItem(PLAYLIST_SETTINGS_STORAGE_KEY, "{not json");
  expect(readPlaylistSettings()).toEqual({ continuous: false, loop: false, autoCheck: false });
});

test("settings saved before continuous existed read it as off", () => {
  window.localStorage.setItem(PLAYLIST_SETTINGS_STORAGE_KEY, '{"loop":true}');
  expect(readPlaylistSettings()).toEqual({ continuous: false, loop: true, autoCheck: false });
});
