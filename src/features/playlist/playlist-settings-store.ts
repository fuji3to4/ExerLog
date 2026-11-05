export const PLAYLIST_SETTINGS_STORAGE_KEY = "exerlog-playlist-settings";

export type PlaylistSettings = { loop: boolean; autoCheck: boolean };

const DEFAULTS: PlaylistSettings = { loop: false, autoCheck: false };

/** Loop / auto-check for continuous play, remembered on this device only. */
export function readPlaylistSettings(): PlaylistSettings {
  try {
    const raw = window.localStorage.getItem(PLAYLIST_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULTS;
    const { loop, autoCheck } = parsed as Partial<PlaylistSettings>;
    return { loop: loop === true, autoCheck: autoCheck === true };
  } catch {
    return DEFAULTS;
  }
}

export function writePlaylistSettings(settings: PlaylistSettings): void {
  try {
    window.localStorage.setItem(PLAYLIST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable: the setting still applies until the page is reloaded.
  }
}
