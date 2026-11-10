import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { scheduleSync } from "@/features/sync/auto-sync";
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
});
