"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  moveModule,
  readModuleSettings,
  resolveModuleSettings,
  setModuleEnabled,
  subscribeModuleSettings,
  writeModuleSettings,
  type ModuleSettings,
} from "./module-settings";
import { getRecordModule, RECORD_MODULES } from "./registry";
import type { RecordModule } from "./types";

// Kept out of module-settings.ts so that importing the settings store does not pull in every
// module's screens (and the import cycles that come with them).

const registryIds = (): string[] => RECORD_MODULES.map((module) => module.data.id);

let serverSnapshot: ModuleSettings | undefined;

function getSnapshot(): ModuleSettings {
  // readModuleSettings returns the same object while the stored value is unchanged.
  return readModuleSettings(registryIds());
}

function getServerSnapshot(): ModuleSettings {
  serverSnapshot ??= resolveModuleSettings(null, registryIds());
  return serverSnapshot;
}

export type ModuleSettingsState = {
  settings: ModuleSettings;
  /** ON modules, in the settings order. */
  enabledModules: readonly RecordModule[];
  /** Every module, in the settings order. */
  entries: readonly { module: RecordModule; enabled: boolean }[];
  setEnabled(id: string, enabled: boolean): void;
  move(id: string, toIndex: number): void;
};

export function useModuleSettings(): ModuleSettingsState {
  const settings = useSyncExternalStore(subscribeModuleSettings, getSnapshot, getServerSnapshot);

  const entries = useMemo(() => {
    const disabled = new Set(settings.disabled);
    return settings.order.flatMap((id) => {
      const found = getRecordModule(id);
      return found ? [{ module: found, enabled: !disabled.has(id) }] : [];
    });
  }, [settings]);

  const enabledModules = useMemo(
    () => entries.filter((entry) => entry.enabled).map((entry) => entry.module),
    [entries],
  );

  return {
    settings,
    enabledModules,
    entries,
    setEnabled: (id, enabled) => writeModuleSettings(setModuleEnabled(getSnapshot(), id, enabled)),
    move: (id, toIndex) => writeModuleSettings(moveModule(getSnapshot(), id, toIndex)),
  };
}
