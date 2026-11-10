import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { scheduleSync } from "@/features/sync/auto-sync";
import type { CustomRecord } from "@/lib/types";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import {
  getCustomTypes,
  loadCustomTypes,
  markTypeDeleted,
  planImport,
  saveImportedDefinition,
  subscribeCustomTypes,
} from "./type-store";

function def(fields: unknown[] = [{ id: "amount", label: "Amount", type: "number" }]): CustomRecordDefinition {
  const r = parseDefinition({ exerlogRecordType: 1, id: "protein", name: "Protein", fields });
  if (!r.ok) throw new Error("bad fixture");
  return r.definition;
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
    const types = getCustomTypes();
    expect(types).toHaveLength(1);
    expect(types[0].definition.id).toBe("protein");
    expect(types[0].deleted).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(scheduleSync).toHaveBeenCalled();
  });

  it("soft-deletes without a tombstone", async () => {
    await saveImportedDefinition(def());
    await markTypeDeleted("protein", true);
    expect(getCustomTypes()[0].deleted).toBe(true);
    expect(await appDb.tombstones.count()).toBe(0);
    await markTypeDeleted("protein", false);
    expect(getCustomTypes()[0].deleted).toBe(false);
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
    expect(getCustomTypes()).toHaveLength(0);
    expect(await appDb.customRecordTypes.count()).toBe(1);
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
    expect(getCustomTypes().map((t) => t.id)).toEqual(["protein"]);

    releaseStale();
    await stale;
    spy.mockRestore();

    expect(getCustomTypes().map((t) => t.id)).toEqual(["protein"]);
  });
});
