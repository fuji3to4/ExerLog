export const MODULE_SETTINGS_STORAGE_KEY = "lymly-record-modules";

export type ModuleSettings = { order: string[]; disabled: string[] };

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** stored: JSON.parse した値（何でもよい）。registryIds: レジストリの順の id。 */
export function resolveModuleSettings(
  stored: unknown,
  registryIds: readonly string[],
): ModuleSettings {
  const known = new Set(registryIds);
  const record =
    stored !== null && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const order: string[] = [];
  const seen = new Set<string>();
  for (const id of [...stringArray(record.order), ...registryIds]) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  const disabled = [...new Set(stringArray(record.disabled))].filter((id) => known.has(id));
  return { order, disabled };
}

let cache: { raw: string | null; ids: string; value: ModuleSettings } | null = null;
// Set only when persisting failed, so the change still shows within this tab.
let unsaved: { raw: string; ids: string; value: ModuleSettings } | null = null;

export function readModuleSettings(registryIds: readonly string[]): ModuleSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(MODULE_SETTINGS_STORAGE_KEY);
  } catch {
    raw = null;
  }
  const ids = registryIds.join("\n");
  if (cache && cache.raw === raw && cache.ids === ids) return cache.value;
  let parsed: unknown = null;
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  const value = resolveModuleSettings(parsed, registryIds);
  cache = { raw, ids, value };
  return value;
}

const listeners = new Set<() => void>();

/** 同じタブ内の全購読者に変更を知らせる（useSyncExternalStore 用）。 */
export function subscribeModuleSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function writeModuleSettings(settings: ModuleSettings): void {
  const raw = JSON.stringify(settings);
  try {
    window.localStorage.setItem(MODULE_SETTINGS_STORAGE_KEY, raw);
    unsaved = null;
  } catch {
    // Storage may be blocked; keep the change in memory for this tab.
    unsaved = { raw, ids: "", value: { order: [...settings.order], disabled: [...settings.disabled] } };
  }
  for (const listener of [...listeners]) listener();
}

export function setModuleEnabled(s: ModuleSettings, id: string, enabled: boolean): ModuleSettings {
  const rest = s.disabled.filter((d) => d !== id);
  return {
    order: [...s.order],
    disabled: enabled ? rest : [...rest, id],
  };
}

export function moveModule(s: ModuleSettings, id: string, toIndex: number): ModuleSettings {
  const rest = s.order.filter((o) => o !== id);
  if (rest.length === s.order.length) return { order: [...s.order], disabled: [...s.disabled] };
  const index = Math.max(0, Math.min(rest.length, Math.trunc(toIndex)));
  rest.splice(index, 0, id);
  return { order: rest, disabled: [...s.disabled] };
}
