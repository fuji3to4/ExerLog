import { appDb } from "@/features/storage/app-db";
import { scheduleSync } from "@/features/sync/auto-sync";
import { localIsoNow } from "@/lib/date/local-iso";
import type { CustomRecordType } from "@/lib/types";
import {
  diffDefinitions,
  parseDefinition,
  type CustomRecordDefinition,
  type DefinitionDiff,
  type DefinitionError,
} from "./definition";
import { coerceValue } from "./values";

export type ImportPlan = {
  kind: "new" | "update" | "restore";
  definition: CustomRecordDefinition;
  diff: DefinitionDiff | null;
};

let types: readonly CustomRecordType[] = [];
const listeners = new Set<() => void>();

function signature(list: readonly CustomRecordType[]): string {
  return list.map((t) => `${t.id}|${t.updatedAt}|${t.deleted ? 1 : 0}`).join("\n");
}

/**
 * Field ids among `ids` for which some stored record of this type holds a value
 * that does not fit the field's (new) type. Catches a removed field coming back
 * with a different type, which a diff against the current definition misses.
 */
async function fieldsWithUnfitValues(definition: CustomRecordDefinition, ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const fields = definition.fields.filter((f) => ids.includes(f.id));
  const records = await appDb.customRecords.where("typeId").equals(definition.id).toArray();
  return fields
    .filter((field) =>
      records.some((r) => {
        const value = r.values[field.id];
        return value !== undefined && coerceValue(field, value) === undefined;
      }),
    )
    .map((f) => f.id);
}

function typeChangedErrors(ids: readonly string[]): { ok: false; errors: DefinitionError[] } {
  return { ok: false, errors: ids.map((id) => ({ code: "type_changed" as const, path: `fields.${id}` })) };
}

export async function planImport(
  definition: CustomRecordDefinition,
): Promise<{ ok: true; plan: ImportPlan } | { ok: false; errors: DefinitionError[] }> {
  const stored = await appDb.customRecordTypes.get(definition.id);
  const parsed = stored ? parseDefinition(stored.definition) : null;
  // No stored definition, or one that cannot be read, cannot conflict by diff;
  // only the values already stored for this type can.
  if (!stored || !parsed?.ok) {
    const kind = !stored ? "new" : stored.deleted ? "restore" : "update";
    const unfit = await fieldsWithUnfitValues(definition, definition.fields.map((f) => f.id));
    if (unfit.length > 0) return typeChangedErrors(unfit);
    return { ok: true, plan: { kind, definition, diff: null } };
  }
  const diff = diffDefinitions(parsed.definition, definition);
  if (diff.typeChanged.length > 0) return typeChangedErrors(diff.typeChanged);
  // A restore also re-checks fields removed before the type was deleted.
  const checked = stored.deleted ? definition.fields.map((f) => f.id) : diff.added;
  const unfit = await fieldsWithUnfitValues(definition, checked);
  if (unfit.length > 0) return typeChangedErrors(unfit);
  return { ok: true, plan: { kind: stored.deleted ? "restore" : "update", definition, diff } };
}

export async function saveImportedDefinition(definition: CustomRecordDefinition): Promise<void> {
  await appDb.customRecordTypes.put({
    id: definition.id,
    definition,
    deleted: false,
    updatedAt: localIsoNow(),
  });
  await loadCustomTypes();
  scheduleSync();
}

export async function markTypeDeleted(id: string, deleted: boolean): Promise<void> {
  const row = await appDb.customRecordTypes.get(id);
  if (!row) return;
  await appDb.customRecordTypes.put({ ...row, deleted, updatedAt: localIsoNow() });
  await loadCustomTypes();
  scheduleSync();
}

// Bumped by every load; only the load holding the latest generation applies its read.
let loadGeneration = 0;
let latestLoad: Promise<void> = Promise.resolve();

/**
 * Reload the types from Dexie. Safe to call concurrently (sync vs. UI import or
 * delete): only the most recently started load applies its result, so an older
 * read never overwrites a newer one. A superseded call resolves once the newest
 * load has applied, so every caller sees a store at least as new as its call.
 */
export function loadCustomTypes(): Promise<void> {
  const generation = ++loadGeneration;
  const load = (async () => {
    const rows = await appDb.customRecordTypes.toArray();
    if (generation !== loadGeneration) return latestLoad;
    applyRows(rows);
  })();
  latestLoad = load;
  return load;
}

function applyRows(rows: readonly CustomRecordType[]): void {
  const next: CustomRecordType[] = [];
  for (const row of rows) {
    const parsed = parseDefinition(row.definition);
    // Invalid rows stay in Dexie untouched (they keep syncing) but are not exposed.
    if (!parsed.ok) continue;
    next.push({ ...row, definition: parsed.definition });
  }
  next.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (signature(next) === signature(types)) return;
  types = next;
  for (const l of [...listeners]) l();
}

export function getCustomTypes(): readonly CustomRecordType[] {
  return types;
}

export function subscribeCustomTypes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
