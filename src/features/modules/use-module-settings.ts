"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { CustomRecordType } from "@/lib/types";
import { getCustomTypes, subscribeCustomTypes } from "./custom/type-store";
import {
  moveModule,
  readModuleSettings,
  resolveModuleSettings,
  setModuleEnabled,
  subscribeModuleSettings,
  writeModuleSettings,
  type ModuleSettings,
} from "./module-settings";
import { defaultOffModuleIds, defaultOnModuleTags } from "./module-tags";
import { recordModules } from "./registry";
import type { RecordModule } from "./types";

// Kept out of module-settings.ts so that importing the settings store does not pull in every
// module's screens (and the import cycles that come with them).

const registryIds = (): string[] => recordModules().map((module) => module.data.id);

const defaultOffIds = (): string[] => defaultOffModuleIds(recordModules(), defaultOnModuleTags());

/** Settings change when they are written and when custom record types load or change. */
function subscribe(listener: () => void): () => void {
  const offSettings = subscribeModuleSettings(listener);
  const offTypes = subscribeCustomTypes(listener);
  return () => {
    offSettings();
    offTypes();
  };
}

const NO_MODULES: readonly RecordModule[] = [];
const getServerModules = (): readonly RecordModule[] => NO_MODULES;

let serverSnapshot: ModuleSettings | undefined;

function getSnapshot(): ModuleSettings {
  // readModuleSettings returns the same object while the stored value is unchanged.
  return readModuleSettings(registryIds(), defaultOffIds());
}

function getServerSnapshot(): ModuleSettings {
  serverSnapshot ??= resolveModuleSettings(null, registryIds(), defaultOffIds());
  return serverSnapshot;
}

export type ModuleSettingsState = {
  settings: ModuleSettings;
  /** ON modules, in the settings order. */
  enabledModules: readonly RecordModule[];
  /** Every module that is not hidden (deleted custom types), in the settings order. */
  entries: readonly { module: RecordModule; enabled: boolean }[];
  setEnabled(id: string, enabled: boolean): void;
  move(id: string, toIndex: number): void;
};

export function useModuleSettings(): ModuleSettingsState {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // A changed custom definition gives a new module object while the settings stay the same.
  const modules = useSyncExternalStore(subscribeCustomTypes, recordModules, getServerModules);

  const entries = useMemo(() => {
    const disabled = new Set(settings.disabled);
    const byId = new Map(modules.map((module) => [module.data.id, module]));
    return settings.order.flatMap((id) => {
      const found = byId.get(id);
      return found && !found.hidden ? [{ module: found, enabled: !disabled.has(id) }] : [];
    });
  }, [settings, modules]);

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

let deletedCache: { types: readonly CustomRecordType[]; value: readonly CustomRecordType[] } | undefined;
const NO_TYPES: readonly CustomRecordType[] = [];

function getDeletedTypes(): readonly CustomRecordType[] {
  const types = getCustomTypes();
  if (deletedCache?.types !== types) deletedCache = { types, value: types.filter((type) => type.deleted) };
  return deletedCache.value;
}

/** Deleted custom record types, for the settings list of deleted definitions (sorted by id). */
export function useDeletedCustomTypes(): readonly CustomRecordType[] {
  return useSyncExternalStore(subscribeCustomTypes, getDeletedTypes, () => NO_TYPES);
}
