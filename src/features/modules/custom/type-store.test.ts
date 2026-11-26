import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { scheduleSync } from "@/features/sync/auto-sync";
import type { CustomRecord } from "@/lib/types";
import { BUILTIN_IDS, BUILTIN_SEED_UPDATED_AT, builtinDefinition, isBuiltinId, type BuiltinId } from "./builtin";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import {
  countRecordsOfType,
  countRecordsUnfitForDefault,
  deleteOrphanRecords,
  getCustomTypes,
  isBuiltinCustomized,
  loadCustomTypes,
  markTypeDeleted,
  planImport,
  purgeType,
  resetBuiltin,
  saveImportedDefinition,
  subscribeCustomTypes,
} from "./type-store";

function def(fields: unknown[] = [{ id: "amount", label: "Amount", type: "number" }]): CustomRecordDefinition {
  const r = parseDefinition({ exerlogRecordType: 1, id: "protein", name: "Protein", fields });
  if (!r.ok) throw new Error("bad fixture");
  return r.definition;
}

/** The store's user-made types, without the seeded built-ins. */
function userTypes() {
  return getCustomTypes().filter((t) => !isBuiltinId(t.id));
}

function record(id: string, values: CustomRecord["values"]): CustomRecord {
  return { id, typeId: "protein", date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", values, note: "", updatedAt: "" };
}

beforeEach(async () => {
  await Promise.all([appDb.customRecordTypes.clear(), appDb.customRecords.clear(), appDb.tombstones.clear()]);
  await loadCustomTypes();
  vi.mocked(scheduleSync).mockClear();
});

describe("custom type store", () => {
  it("plans new, update, restore and type changes", async () => {
    const d = def();
    const first = await planImport(d);
    expect(first).toMatchObject({ ok: true, plan: { kind: "new", diff: null } });

    await saveImportedDefinition(d);
    const next = def([
      { id: "amount", label: "Amount", type: "number" },
      { id: "brand", label: "Brand", type: "text" },
    ]);
    const upd = await planImport(next);
    expect(upd).toMatchObject({ ok: true, plan: { kind: "update", diff: { added: ["brand"] } } });

    const changed = def([{ id: "amount", label: "Amount", type: "text" }]);
    expect(await planImport(changed)).toEqual({
      ok: false,
      errors: [{ code: "type_changed", path: "fields.amount" }],
    });

    await markTypeDeleted("protein", true);
    expect(await planImport(d)).toMatchObject({ ok: true, plan: { kind: "restore" } });
    expect((await planImport(changed)).ok).toBe(false);
  });

  it("rejects re-adding a removed field id with a type its stored values do not fit", async () => {
    await saveImportedDefinition(def());
    await appDb.customRecords.bulkAdd([
      record("a", { amount: 30, legacy: ["x"] }),
      record("b", { amount: 40 }),
    ]);
    const removed = def([{ id: "brand", label: "Brand", type: "text" }]);
    expect(await planImport(removed)).toMatchObject({ ok: true, plan: { kind: "update" } });
    await saveImportedDefinition(removed);

    for (const type of ["text", "multiChoice", "boolean"]) {
      const options = type === "multiChoice" ? { options: [{ id: "o", label: "o" }] } : {};
      expect(
        await planImport(def([{ id: "brand", label: "Brand", type: "text" }, { id: "amount", label: "A", type, ...options }])),
      ).toEqual({ ok: false, errors: [{ code: "type_changed", path: "fields.amount" }] });
    }
    // The same type, or a type every stored value fits, is fine.
    expect(
      await planImport(def([{ id: "amount", label: "A", type: "scale" }])),
    ).toMatchObject({ ok: true, plan: { kind: "update", diff: { added: ["amount"] } } });
    expect(
      await planImport(def([{ id: "legacy", label: "L", type: "multiChoice", options: [{ id: "x", label: "x" }] }])),
    ).toMatchObject({ ok: true });
    expect(await planImport(def([{ id: "legacy", label: "L", type: "text" }]))).toEqual({
      ok: false,
      errors: [{ code: "type_changed", path: "fields.legacy" }],
    });
  });

  it("checks raw sheet strings the same way", async () => {
    await saveImportedDefinition(def([{ id: "brand", label: "Brand", type: "text" }]));
    await appDb.customRecords.bulkAdd([record("a", { amount: "30", flag: "1" })]);
    expect(await planImport(def([{ id: "amount", label: "A", type: "number" }]))).toMatchObject({ ok: true });
    expect(await planImport(def([{ id: "flag", label: "F", type: "boolean" }]))).toMatchObject({ ok: true });
    await appDb.customRecords.put(record("b", { amount: "abc" }));
    expect((await planImport(def([{ id: "amount", label: "A", type: "number" }]))).ok).toBe(false);
  });

  it("checks every field of a new or restored type against stored records", async () => {
    // Records may arrive before (or outlive) their definition.
    await appDb.customRecords.bulkAdd([record("a", { amount: "abc" }), { ...record("o", { amount: 1 }), typeId: "other" }]);
    expect(await planImport(def())).toEqual({ ok: false, errors: [{ code: "type_changed", path: "fields.amount" }] });
    expect(await planImport(def([{ id: "amount", label: "A", type: "text" }]))).toMatchObject({
      ok: true,
      plan: { kind: "new" },
    });

    await saveImportedDefinition(def([{ id: "amount", label: "A", type: "text" }]));
    await markTypeDeleted("protein", true);
    await appDb.customRecords.put(record("b", { other: 5 }));
    expect(await planImport(def([{ id: "amount", label: "A", type: "text" }, { id: "other", label: "O", type: "text" }]))).toEqual({
      ok: false,
      errors: [{ code: "type_changed", path: "fields.other" }],
    });
  });

  it("saves, notifies once and schedules sync", async () => {
    const listener = vi.fn();
    const off = subscribeCustomTypes(listener);
    await saveImportedDefinition(def());
    off();
    const types = userTypes();
    expect(types).toHaveLength(1);
    expect(types[0].definition.id).toBe("protein");
    expect(types[0].deleted).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(scheduleSync).toHaveBeenCalled();
  });

  it("soft-deletes without a tombstone", async () => {
    await saveImportedDefinition(def());
    await markTypeDeleted("protein", true);
    expect(userTypes()[0].deleted).toBe(true);
    expect(await appDb.tombstones.count()).toBe(0);
    await markTypeDeleted("protein", false);
    expect(userTypes()[0].deleted).toBe(false);
  });

  it("keeps the same array reference while content is unchanged", async () => {
    await saveImportedDefinition(def());
    const a = getCustomTypes();
    const listener = vi.fn();
    const off = subscribeCustomTypes(listener);
    await loadCustomTypes();
    await loadCustomTypes();
    off();
    expect(getCustomTypes()).toBe(a);
    expect(listener).not.toHaveBeenCalled();
  });

  it("skips rows whose definition is invalid", async () => {
    await appDb.customRecordTypes.put({
      id: "broken",
      definition: { nope: true } as unknown as CustomRecordDefinition,
      deleted: false,
      updatedAt: "2026-01-01T00:00:00+09:00",
    });
    await loadCustomTypes();
    expect(userTypes()).toHaveLength(0);
    expect(await appDb.customRecordTypes.get("broken")).toBeDefined();
  });

  it("an older load that finishes last does not overwrite a newer one", async () => {
    const realToArray = appDb.customRecordTypes.toArray.bind(appDb.customRecordTypes);
    let releaseStale!: () => void;
    const spy = vi
      .spyOn(appDb.customRecordTypes, "toArray")
      // The first (older) read snapshots the empty table but resolves only when released.
      // Dexie types toArray as PromiseExtended; a plain promise is enough for the store.
      .mockImplementationOnce((async () => {
        const snapshot = await realToArray();
        await new Promise<void>((resolve) => {
          releaseStale = resolve;
        });
        return snapshot;
      }) as unknown as typeof realToArray);

    const stale = loadCustomTypes();
    await vi.waitFor(() => expect(releaseStale).toBeDefined());
    await appDb.customRecordTypes.put({
      id: "protein",
      definition: def(),
      deleted: false,
      updatedAt: "2026-01-01T00:00:00+09:00",
    });
    await loadCustomTypes();
    expect(userTypes().map((t) => t.id)).toEqual(["protein"]);

    releaseStale();
    await stale;
    spy.mockRestore();

    expect(userTypes().map((t) => t.id)).toEqual(["protein"]);
  });

  it("purges a deleted type with its records, recording tombstones for both", async () => {
    await saveImportedDefinition(def());
    await appDb.customRecords.bulkAdd([
      record("a", { amount: 1 }),
      record("b", { amount: 2 }),
      { ...record("o", { amount: 3 }), typeId: "other" },
    ]);
    await markTypeDeleted("protein", true);
    expect(await countRecordsOfType("protein")).toBe(2);
    vi.mocked(scheduleSync).mockClear();

    await purgeType("protein");

    expect(await appDb.customRecordTypes.get("protein")).toBeUndefined();
    expect((await appDb.customRecords.toArray()).map((r) => r.id)).toEqual(["o"]);
    expect((await appDb.tombstones.toArray()).map((t) => t.id).sort()).toEqual([
      "Custom_protein:a",
      "Custom_protein:b",
      "RecordTypes:protein",
    ]);
    expect(userTypes()).toHaveLength(0);
    expect(scheduleSync).toHaveBeenCalled();
    expect(await countRecordsOfType("protein")).toBe(0);
  });

  it("does not purge a type that is not deleted", async () => {
    await saveImportedDefinition(def());
    await appDb.customRecords.put(record("a", { amount: 1 }));

    await purgeType("protein");
    await purgeType("missing");

    expect(await appDb.customRecordTypes.get("protein")).toBeDefined();
    expect(await appDb.customRecords.count()).toBe(1);
    expect(await appDb.tombstones.count()).toBe(0);
  });

  it("deletes orphan records not newer than their type's tombstone, keeping the rest", async () => {
    await appDb.customRecordTypes.put({
      id: "broken",
      definition: { nope: true } as unknown as CustomRecordDefinition,
      deleted: false,
      updatedAt: "2026-01-01T00:00:00+09:00",
    });
    await appDb.tombstones.bulkPut(
      ["protein", "broken"].map((id) => ({
        id: `RecordTypes:${id}`,
        table: "RecordTypes",
        recordId: id,
        deletedAt: "2026-10-21T00:00:00+09:00",
      })),
    );
    const at = (updatedAt: string) => ({ updatedAt });
    await appDb.customRecords.bulkAdd([
      { ...record("old", { amount: 1 }), ...at("2026-10-20T08:00:00+09:00") },
      { ...record("same", { amount: 1 }), ...at("2026-10-21T00:00:00+09:00") },
      { ...record("new", { amount: 1 }), ...at("2026-10-22T08:00:00+09:00") },
      { ...record("k", { amount: 2 }), typeId: "broken", ...at("2026-10-20T08:00:00+09:00") },
      { ...record("u", { amount: 2 }), typeId: "untombstoned", ...at("2026-10-20T08:00:00+09:00") },
    ]);

    expect(await deleteOrphanRecords()).toBe(2);

    expect((await appDb.customRecords.toArray()).map((r) => r.id).sort()).toEqual(["k", "new", "u"]);
    expect(await appDb.tombstones.count()).toBe(2);
  });

  it("dates a re-import or restore after a known type tombstone even when the clock is behind", async () => {
    await appDb.tombstones.put({
      id: "RecordTypes:protein",
      table: "RecordTypes",
      recordId: "protein",
      deletedAt: "2099-01-01T00:00:00+09:00",
    });
    const format = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

    await saveImportedDefinition(def());
    const saved = (await appDb.customRecordTypes.get("protein"))!.updatedAt;
    expect(saved).toMatch(format);
    expect(Date.parse(saved)).toBeGreaterThan(Date.parse("2099-01-01T00:00:00+09:00"));

    await markTypeDeleted("protein", true);
    await markTypeDeleted("protein", false);
    const restored = (await appDb.customRecordTypes.get("protein"))!.updatedAt;
    expect(restored).toMatch(format);
    expect(Date.parse(restored)).toBeGreaterThan(Date.parse("2099-01-01T00:00:00+09:00"));
  });
});

function builtinWith(id: BuiltinId, change: (fields: unknown[]) => unknown[], rest: Record<string, unknown> = {}): CustomRecordDefinition {
  const base = structuredClone(builtinDefinition(id));
  const r = parseDefinition({ ...base, ...rest, fields: change(base.fields as unknown[]) });
  if (!r.ok) throw new Error("bad fixture");
  return r.definition;
}

function builtinRecord(id: string, typeId: string, values: CustomRecord["values"]): CustomRecord {
  return { ...record(id, values), typeId, updatedAt: "2026-10-20T08:00:00+09:00" };
}

describe("built-in types", () => {
  it("seeds missing built-in types with the fixed date", async () => {
    await appDb.customRecordTypes.clear();
    await loadCustomTypes();
    const rows = await appDb.customRecordTypes.toArray();
    expect(rows.map((r) => r.id).sort()).toEqual([...BUILTIN_IDS].sort());
    for (const row of rows) {
      expect(row.updatedAt).toBe(BUILTIN_SEED_UPDATED_AT);
      expect(row.deleted).toBe(false);
      expect(row.definition).toEqual(builtinDefinition(row.id as BuiltinId));
    }
    expect(getCustomTypes().map((t) => t.id)).toEqual(["body", "girth", "selfcare", "wellness"]);
  });

  it("keeps a customized built-in on load", async () => {
    const custom = builtinWith("wellness", (f) => [...f, { id: "appetite", label: "Appetite", type: "number" }]);
    await saveImportedDefinition(custom);
    await loadCustomTypes();
    const row = await appDb.customRecordTypes.get("wellness");
    expect(row!.definition.fields.map((f) => f.id)).toContain("appetite");
    expect(row!.updatedAt).not.toBe(BUILTIN_SEED_UPDATED_AT);
    expect(isBuiltinCustomized("wellness")).toBe(true);
    expect(isBuiltinCustomized("body")).toBe(false);
  });

  it("replaces an untouched seed with the shipped definition", async () => {
    const stale = builtinWith("girth", (f) => f.slice(0, 1));
    await appDb.customRecordTypes.put({ id: "girth", definition: stale, deleted: false, updatedAt: BUILTIN_SEED_UPDATED_AT });
    await loadCustomTypes();
    expect((await appDb.customRecordTypes.get("girth"))!.definition).toEqual(builtinDefinition("girth"));
  });

  it("an untouched old selfcare seed is replaced by the new one", async () => {
    const old = builtinWith("selfcare", (f) => [
      ...f,
      { id: "minutes", label: { ja: "時間", en: "Duration" }, type: "number", required: false, unit: "分", min: 1, step: 1 },
    ]);
    delete old.hasEnd;
    await appDb.customRecordTypes.put({ id: "selfcare", definition: old, deleted: false, updatedAt: "2000-01-01T00:00:00+00:00" });
    await loadCustomTypes();
    const row = (await appDb.customRecordTypes.get("selfcare"))!;
    expect(row.definition.hasEnd).toBe(true);
    expect(row.definition.fields.some((f) => f.id === "minutes")).toBe(false);
    expect(row.updatedAt).toBe(BUILTIN_SEED_UPDATED_AT);
  });

  it("a user-edited selfcare definition is left alone", async () => {
    const edited = builtinWith("selfcare", (f) => f);
    delete edited.hasEnd;
    await appDb.customRecordTypes.put({ id: "selfcare", definition: edited, deleted: false, updatedAt: "2026-11-20T10:00:00+09:00" });
    await loadCustomTypes();
    const row = (await appDb.customRecordTypes.get("selfcare"))!;
    expect(row.definition).toEqual(edited);
    expect(row.updatedAt).toBe("2026-11-20T10:00:00+09:00");
  });

  it("keeps an untouched seed whose records do not fit the shipped definition", async () => {
    const stale = builtinWith("girth", (f) => f.map((x) => ((x as { id: string }).id === "chest" ? { id: "chest", label: "Chest", type: "text" } : x)));
    await appDb.customRecordTypes.put({ id: "girth", definition: stale, deleted: true, updatedAt: BUILTIN_SEED_UPDATED_AT });
    await appDb.customRecords.put(builtinRecord("g", "girth", { chest: "wide" }));
    await loadCustomTypes();
    const row = (await appDb.customRecordTypes.get("girth"))!;
    expect(row.definition).toEqual(stale);
    expect(row.deleted).toBe(false);
  });

  it("ignores leftover tombstones and deleted flags for built-in ids", async () => {
    await appDb.tombstones.put({ id: "RecordTypes:wellness", table: "RecordTypes", recordId: "wellness", deletedAt: "2026-10-21T00:00:00+09:00" });
    await appDb.customRecordTypes.put({
      id: "wellness",
      definition: structuredClone(builtinDefinition("wellness")),
      deleted: true,
      updatedAt: "2026-10-01T00:00:00+09:00",
    });
    await appDb.customRecords.put(builtinRecord("w", "wellness", { physical: 3, mental: 4 }));
    await loadCustomTypes();

    expect((await appDb.customRecordTypes.get("wellness"))!.deleted).toBe(false);
    expect(getCustomTypes().find((t) => t.id === "wellness")!.deleted).toBe(false);
    expect(await appDb.tombstones.get("RecordTypes:wellness")).toBeUndefined();

    // Even with the row gone and a tombstone back (e.g. mid-sync), built-in records stay.
    await appDb.customRecordTypes.delete("wellness");
    await appDb.tombstones.put({ id: "RecordTypes:wellness", table: "RecordTypes", recordId: "wellness", deletedAt: "2026-10-21T00:00:00+09:00" });
    await deleteOrphanRecords();
    expect(await appDb.customRecords.get("w")).toBeDefined();
  });

  it("deleted flags of built-in rows read as not deleted", async () => {
    await loadCustomTypes();
    await appDb.customRecordTypes.update("selfcare", { deleted: true });
    // ensureBuiltinTypes clears it; applyRows would hide it either way.
    await loadCustomTypes();
    expect(getCustomTypes().find((t) => t.id === "selfcare")!.deleted).toBe(false);
  });

  it("refuses to delete built-ins", async () => {
    await appDb.customRecords.put(builtinRecord("b", "body", { weight: 60 }));
    const before = await appDb.customRecordTypes.get("body");
    vi.mocked(scheduleSync).mockClear();
    await markTypeDeleted("body", true);
    await purgeType("body");
    expect(await appDb.customRecordTypes.get("body")).toEqual(before);
    expect(await appDb.customRecords.get("b")).toBeDefined();
    expect(await appDb.tombstones.count()).toBe(0);
    expect(scheduleSync).not.toHaveBeenCalled();
  });

  it("rejects a body import that removes height", async () => {
    const noHeight = builtinWith("body", (f) => f.filter((x) => (x as { id: string }).id !== "height"));
    expect(await planImport(noHeight)).toEqual({ ok: false, errors: [{ code: "locked_field", path: "fields.height" }] });
    const renamed = builtinWith("body", (f) => f, { name: { ja: "からだ", en: "Me" } });
    expect(await planImport(renamed)).toMatchObject({ ok: true, plan: { kind: "update" } });
  });

  it("resets a built-in to its default", async () => {
    await saveImportedDefinition(builtinWith("girth", (f) => [...f, { id: "hip", label: "Hip", type: "number", unit: "cm" }]));
    await appDb.customRecords.put(builtinRecord("h", "girth", { chest: 90, hip: 95 }));
    expect(isBuiltinCustomized("girth")).toBe(true);
    vi.mocked(scheduleSync).mockClear();

    await resetBuiltin("girth");

    const row = (await appDb.customRecordTypes.get("girth"))!;
    expect(row.definition).toEqual(builtinDefinition("girth"));
    expect(row.updatedAt).not.toBe(BUILTIN_SEED_UPDATED_AT);
    expect(row.deleted).toBe(false);
    expect(isBuiltinCustomized("girth")).toBe(false);
    expect((await appDb.customRecords.get("h"))!.values.hip).toBe(95);
    expect(scheduleSync).toHaveBeenCalled();
  });

  it("counts records unfit for the default", async () => {
    await saveImportedDefinition(
      builtinWith("wellness", (f) => [
        ...f.filter((x) => (x as { id: string }).id !== "physical"),
        { id: "physical", label: "Physical", type: "text" },
      ]),
    );
    await appDb.customRecords.bulkPut([
      builtinRecord("t", "wellness", { physical: "tired", mental: 3 }),
      builtinRecord("n", "wellness", { physical: 2, mental: 3 }),
      builtinRecord("o", "body", { physical: "x" }),
    ]);
    expect(await countRecordsUnfitForDefault("wellness")).toBe(1);
  });
});

describe("loadCustomTypes when seeding fails", () => {
  it("still loads user types", async () => {
    await saveImportedDefinition(def());
    const spy = vi.spyOn(appDb, "transaction").mockRejectedValueOnce(new Error("quota"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await loadCustomTypes();
      expect(userTypes().map((t) => t.id)).toEqual(["protein"]);
      expect(log).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      log.mockRestore();
    }
  });
});
