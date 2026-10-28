import { useSyncExternalStore } from "react";

/** 「写真を同期する」. Stored on this device only: "on" / "off". */
export const PHOTO_SYNC_STORAGE_KEY = "lymly-photo-sync";

// Set only when persisting failed, so the change still applies within this tab.
let unsaved: boolean | null = null;
const listeners = new Set<() => void>();

/** Missing, unknown or unreadable values count as on. */
export function readPhotoSyncEnabled(): boolean {
  if (unsaved !== null) return unsaved;
  try {
    return window.localStorage.getItem(PHOTO_SYNC_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writePhotoSyncEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(PHOTO_SYNC_STORAGE_KEY, enabled ? "on" : "off");
    unsaved = null;
  } catch {
    unsaved = enabled;
  }
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PHOTO_SYNC_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePhotoSyncEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, readPhotoSyncEnabled, () => true);
  return [enabled, writePhotoSyncEnabled];
}
