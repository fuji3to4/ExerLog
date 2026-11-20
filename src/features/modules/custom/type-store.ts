import { appDb } from "@/features/storage/app-db";
import { scheduleSync } from "@/features/sync/auto-sync";
import { formatLocalIso, localIsoNow } from "@/lib/date/local-iso";
import type { CustomRecordType } from "@/lib/types";
import {
  BUILTIN_IDS,
  BUILTIN_SEED_UPDATED_AT,
  KNOWN_SEED_UPDATED_ATS,
  builtinDefinition,
  isBuiltinId,
  isDefaultDefinition,
  lockedFieldErrors,
  type BuiltinId,
} from "./builtin";
import { customTabName, recordTypesSyncConfig } from "./data";
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
  const locked = lockedFieldErrors(definition);
  if (locked.length > 0) return { ok: false, errors: locked };
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

function typeTombstoneId(id: string): string {
  return `${recordTypesSyncConfig.tabName}:${id}`;
}

/**
 * Now, but at least one second after a known tombstone of this type, so a
 * re-import or restore wins the merge even when this clock runs behind the
 * one that purged it; and after the stored row's date, so a second save within
 * the same second still changes updatedAt (the store and the registries key
 * their caches on it).
 */
async function liveTypeUpdatedAt(id: string): Promise<string> {
  const now = localIsoNow();
  const tombstone = await appDb.tombstones.get(typeTombstoneId(id));
  const row = await appDb.customRecordTypes.get(id);
  const known = [tombstone?.deletedAt, row?.updatedAt]
    .map((iso) => (iso === undefined ? NaN : Date.parse(iso)))
    .filter((time) => !Number.isNaN(time));
  const after = Math.max(-Infinity, ...known);
  if (Date.parse(now) > after) return now;
  // Whole seconds (the format drops milliseconds), still strictly after `after`.
  return formatLocalIso(new Date(Math.floor(after / 1000) * 1000 + 1000));
}

export async function saveImportedDefinition(definition: CustomRecordDefinition): Promise<void> {
  await appDb.customRecordTypes.put({
    id: definition.id,
    definition,
    deleted: false,
    updatedAt: await liveTypeUpdatedAt(definition.id),
  });
  await loadCustomTypes();
  scheduleSync();
}

/** Built-in types cannot be deleted: a no-op for their ids. */
export async function markTypeDeleted(id: string, deleted: boolean): Promise<void> {
  if (isBuiltinId(id)) return;
  const row = await appDb.customRecordTypes.get(id);
  if (!row) return;
  const updatedAt = deleted ? localIsoNow() : await liveTypeUpdatedAt(id);
  await appDb.customRecordTypes.put({ ...row, deleted, updatedAt });
  await loadCustomTypes();
  scheduleSync();
}

export function countRecordsOfType(id: string): Promise<number> {
  return appDb.customRecords.where("typeId").equals(id).count();
}

/**
 * Permanently delete a soft-deleted type and its records, with tombstones so
 * the deletion reaches the sheet and other devices. A type that is missing or
 * not deleted is left alone, and so is a built-in type.
 */
export async function purgeType(id: string): Promise<void> {
  if (isBuiltinId(id)) return;
  const purged = await appDb.transaction(
    "rw",
    appDb.customRecords,
    appDb.customRecordTypes,
    appDb.tombstones,
    async () => {
      const row = await appDb.customRecordTypes.get(id);
      if (!row?.deleted) return false;
      const own = appDb.customRecords.where("typeId").equals(id);
      const recordIds = await own.primaryKeys();
      await own.delete();
      await appDb.customRecordTypes.delete(id);
      const deletedAt = localIsoNow();
      const tombstone = (table: string, recordId: string) => ({ id: `${table}:${recordId}`, table, recordId, deletedAt });
      await appDb.tombstones.bulkPut([
        ...recordIds.map((recordId) => tombstone(customTabName(id), recordId)),
        tombstone(recordTypesSyncConfig.tabName, id),
      ]);
      return true;
    },
  );
  if (!purged) return;
  await loadCustomTypes();
  scheduleSync();
}

/**
 * Delete local records of types purged on another device: the type has no row
 * and a type tombstone exists that the record is not newer than (last writer
 * wins, as in the merge; a record without a usable time loses). Other orphans
 * stay, unseen, until their type is imported again. No tombstones: the device
 * that purged the type recorded them. Records of built-in types always stay.
 * Returns the count.
 */
export function deleteOrphanRecords(): Promise<number> {
  return appDb.transaction("rw", appDb.customRecords, appDb.customRecordTypes, appDb.tombstones, async () => {
    const known = new Set(await appDb.customRecordTypes.toCollection().primaryKeys());
    const tombstones = await appDb.tombstones.where("table").equals(recordTypesSyncConfig.tabName).toArray();
    const deletedAt = new Map(tombstones.map((t) => [t.recordId, Date.parse(t.deletedAt)]));
    return appDb.customRecords
      .filter((r) => {
        if (known.has(r.typeId) || isBuiltinId(r.typeId)) return false;
        const purgedAt = deletedAt.get(r.typeId);
        if (purgedAt === undefined) return false;
        const updatedAt = Date.parse(r.updatedAt);
        return Number.isNaN(updatedAt) || updatedAt <= purgedAt;
      })
      .delete();
  });
}

/** A copy of the shipped definition, safe to store (builtinDefinition returns a shared object). */
function shippedDefinition(id: BuiltinId): CustomRecordDefinition {
  return structuredClone(builtinDefinition(id));
}

/**
 * Make sure every built-in type has a live row on this device:
 * - a missing row is seeded with the fixed (old) date, so any real edit wins the merge;
 * - an untouched seed (its date is a known seed date) is upgraded to the shipped
 *   definition, unless stored records hold values the shipped fields do not fit;
 * - a deleted flag is cleared, keeping a customized definition as it is;
 * - a leftover RecordTypes tombstone for the id is dropped, so sync does not keep
 *   removing the seeded row.
 * Writes only what changes.
 */
export async function ensureBuiltinTypes(): Promise<void> {
  await appDb.transaction("rw", appDb.customRecordTypes, appDb.customRecords, appDb.tombstones, async () => {
    for (const id of BUILTIN_IDS) {
      const tombstoneId = typeTombstoneId(id);
      if (await appDb.tombstones.get(tombstoneId)) await appDb.tombstones.delete(tombstoneId);

      const row = await appDb.customRecordTypes.get(id);
      const shipped = shippedDefinition(id);
      const seed = { id, definition: shipped, deleted: false, updatedAt: BUILTIN_SEED_UPDATED_AT };
      if (!row) {
        await appDb.customRecordTypes.put(seed);
        continue;
      }
      if (KNOWN_SEED_UPDATED_ATS.includes(row.updatedAt)) {
        const parsed = parseDefinition(row.definition);
        const upToDate =
          row.updatedAt === BUILTIN_SEED_UPDATED_AT && parsed.ok && isDefaultDefinition(id, parsed.definition);
        if (!upToDate) {
          const unfit = await fieldsWithUnfitValues(shipped, shipped.fields.map((f) => f.id));
          if (unfit.length === 0) {
            await appDb.customRecordTypes.put(seed);
            continue;
          }
        }
      }
      if (row.deleted) await appDb.customRecordTypes.put({ ...row, deleted: false });
    }
  });
}

/** Whether this device's definition of a built-in type differs from the shipped one. */
export function isBuiltinCustomized(id: BuiltinId): boolean {
  const type = types.find((t) => t.id === id);
  return type !== undefined && !isDefaultDefinition(id, type.definition);
}

/**
 * Store the shipped definition, dated now so the reset reaches other devices,
 * and sync. Records keep every value, including those the default no longer shows.
 */
export async function resetBuiltin(id: BuiltinId): Promise<void> {
  await appDb.customRecordTypes.put({
    id,
    definition: shippedDefinition(id),
    deleted: false,
    updatedAt: await liveTypeUpdatedAt(id),
  });
  await loadCustomTypes();
  scheduleSync();
}

/** Records of a built-in type holding a value the shipped definition would hide (for the reset prompt). */
export async function countRecordsUnfitForDefault(id: BuiltinId): Promise<number> {
  const fields = builtinDefinition(id).fields;
  const records = await appDb.customRecords.where("typeId").equals(id).toArray();
  return records.filter((r) =>
    fields.some((field) => {
      const value = r.values[field.id];
      return value !== undefined && coerceValue(field, value) === undefined;
    }),
  ).length;
}

// Bumped by every load; only the load holding the latest generation applies its read.
let loadGeneration = 0;
let latestLoad: Promise<void> = Promise.resolve();

/**
 * Reload the types from Dexie. Safe to call concurrently (sync vs. UI import or
 * delete): only the most recently started load applies its result, so an older
 * read never overwrites a newer one. A superseded call resolves once the newest
 * load has applied, so every caller sees a store at least as new as its call.
 * Seeds or repairs the built-in types first (ensureBuiltinTypes).
 */
export function loadCustomTypes(): Promise<void> {
  const generation = ++loadGeneration;
  const load = (async () => {
    await ensureBuiltinTypes();
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
    // A built-in type is never shown as deleted, whatever the row says.
    next.push({ ...row, definition: parsed.definition, deleted: isBuiltinId(row.id) ? false : row.deleted });
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
