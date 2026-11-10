import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { localIsoAt } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import type { CustomRecordType } from "@/lib/types";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import {
  addCustomRecord,
  createCustomModuleData,
  deleteCustomRecord,
  recordTypesSyncConfig,
  updateCustomRecord,
} from "./data";

function def(id: string, extraFields: object[] = []): CustomRecordDefinition {
  const r = parseDefinition({
    id,
    name: id,
    fields: [
      { id: "amount", label: "a", type: "number" },
      { id: "kind", label: "k", type: "choice", options: [{ id: "whey", label: "w" }] },
      { id: "timing", label: "t", type: "multiChoice", options: [{ id: "post", label: "p" }] },
      { id: "fasted", label: "f", type: "boolean" },
      ...extraFields,
    ],
  });
  if (!r.ok) throw new Error("fixture");
  return r.definition;
}
const typeOf = (definition: CustomRecordDefinition): CustomRecordType => ({
  id: definition.id,
  definition,
  deleted: false,
  updatedAt: "",
});

const protein = def("protein", [
  { id: "brand", label: "b", type: "text" },
  { id: "taste", label: "s", type: "scale" },
]);
const meal = def("meal");
const day = "2026-10-05";
const at = localIsoAt(day, new Date(2026, 0, 1, 10, 0, 0));
const input = (values = {}) => ({ date: day, recordedAt: at, values, note: " n " });

beforeEach(async () => {
  await Promise.all([appDb.customRecords.clear(), appDb.customRecordTypes.clear(), appDb.tombstones.clear()]);
});

describe("custom record data", () => {
  it("adds, updates and deletes with a tombstone on Custom_protein", async () => {
    const rec = await addCustomRecord(protein, input({ amount: "30" }));
    expect((await appDb.customRecords.get(rec.id))?.values).toEqual({ amount: 30 });
    expect(rec.note).toBe("n");
    await updateCustomRecord(protein, { ...rec, values: { amount: 40 } });
    expect((await appDb.customRecords.get(rec.id))?.values).toEqual({ amount: 40 });
    await deleteCustomRecord("protein", rec.id);
    expect(await appDb.customRecords.get(rec.id)).toBeUndefined();
    const tombs = await appDb.tombstones.toArray();
    expect(tombs.map((t) => [t.table, t.id])).toEqual([["Custom_protein", `Custom_protein:${rec.id}`]]);
  });

  it("keeps values of removed fields on update", async () => {
    const withBrand = def("protein", [{ id: "brand", label: "b", type: "text" }]);
    const rec = await addCustomRecord(withBrand, input({ amount: 30, brand: "X" }));
    const without = def("protein");
    await updateCustomRecord(without, { ...rec, values: { amount: 40 } });
    expect((await appDb.customRecords.get(rec.id))?.values).toEqual({ amount: 40, brand: "X" });
  });

  it("lists only its own type", async () => {
    const p = await addCustomRecord(protein, input({ amount: 1 }));
    await addCustomRecord(meal, input({ amount: 2 }));
    const data = createCustomModuleData(typeOf(protein));
    expect((await data.listForDay(day)).map((r) => r.id)).toEqual([p.id]);
    expect(await data.count()).toBe(1);
    expect([...(await data.datesWithRecordsInMonth("2026-10"))]).toEqual([day]);
    expect(await createCustomModuleData(typeOf(meal)).count()).toBe(1);
  });

  it("replaceDb leaves other types alone", async () => {
    await addCustomRecord(protein, input({ amount: 1 }));
    const m = await addCustomRecord(meal, input({ amount: 2 }));
    await createCustomModuleData(typeOf(protein)).syncConfigs[0].replaceDb([]);
    expect((await appDb.customRecords.toArray()).map((r) => r.id)).toEqual([m.id]);
  });

  it("round-trips removed-field columns", async () => {
    const rec = await addCustomRecord(protein, input({ amount: 30, kind: "whey", timing: ["post"], fasted: true, zzOld: "v" }));
    const config = createCustomModuleData(typeOf(protein)).syncConfigs[0];
    const stored = await config.readFromDb();
    const headers = config.buildHeaders!(stored);
    expect(headers).toEqual([
      "id", "date", "recordedAt", "note", "updatedAt",
      "amount", "kind", "timing", "fasted", "brand", "taste", "zzOld",
    ]);
    const back = config.fromRow(config.toRow(stored[0], headers), headers);
    expect(back).toEqual(rec);
  });

  it("clearAll records tombstones only for its tab", async () => {
    const p = await addCustomRecord(protein, input({ amount: 1 }));
    const m = await addCustomRecord(meal, input({ amount: 2 }));
    await createCustomModuleData(typeOf(protein)).clearAll();
    expect((await appDb.customRecords.toArray()).map((r) => r.id)).toEqual([m.id]);
    expect((await appDb.tombstones.toArray()).map((t) => [t.table, t.id])).toEqual([["Custom_protein", `Custom_protein:${p.id}`]]);
  });

  it("exports csv without updatedAt", async () => {
    await addCustomRecord(protein, input({ amount: 30, fasted: false }));
    const data = createCustomModuleData(typeOf(protein));
    expect(data.csv.fileName).toBe("custom-protein.csv");
    const csv = await data.csv.generate();
    expect(csv.split("\n")[0]).toContain("id,date,recordedAt,note,amount,kind,timing,fasted,brand,taste");
    expect(csv).toContain(",30,");
  });
});

describe("recordTypesSyncConfig", () => {
  it("round-trips a type and keeps an unparsable definition", () => {
    const row = recordTypesSyncConfig.toRow(typeOf(meal), recordTypesSyncConfig.headers);
    expect(recordTypesSyncConfig.fromRow(row, recordTypesSyncConfig.headers)).toEqual(typeOf(meal));
    const bad = recordTypesSyncConfig.fromRow(["x", "{oops", "1", "u"], recordTypesSyncConfig.headers);
    expect(bad.definition).toBe("{oops");
    expect(bad.deleted).toBe(true);
    expect(recordTypesSyncConfig.toRow(bad, recordTypesSyncConfig.headers)[1]).toBe("{oops");
  });
});
