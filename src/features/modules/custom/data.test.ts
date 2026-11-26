import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
import { localIsoAt } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import type { CustomRecordType } from "@/lib/types";
import { builtinDefinition } from "./builtin";
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
    const rec = await addCustomRecord(protein, input({ amount: 30, kind: "whey", timing: ["post"], fasted: true }));
    const config = createCustomModuleData(typeOf(protein)).syncConfigs[0];
    const stored = await config.readFromDb();
    const headers = config.buildHeaders!(stored);
    expect(headers).toEqual([
      "id", "date", "recordedAt", "note", "updatedAt",
      "amount", "kind", "timing", "fasted", "brand", "taste",
    ]);
    expect(config.fromRow(config.toRow(stored[0], headers), headers)).toEqual(rec);
  });

  it("restores typed values of removed fields that came back through the sheet", async () => {
    const rec = await addCustomRecord(protein, input({ amount: 30, timing: ["post"], fasted: false }));
    const slimParsed = parseDefinition({ id: "protein", name: "protein", fields: [{ id: "brand", label: "b", type: "text" }] });
    if (!slimParsed.ok) throw new Error("fixture");
    // While the fields are removed, the sheet round trip leaves raw strings.
    const slim = createCustomModuleData(typeOf(slimParsed.definition)).syncConfigs[0];
    const headers = slim.buildHeaders!([rec]);
    expect(headers).toEqual(["id", "date", "recordedAt", "note", "updatedAt", "brand", "amount", "fasted", "timing"]);
    const back = slim.fromRow(slim.toRow(rec, headers), headers) as typeof rec;
    expect(back.values).toEqual({ amount: "30", timing: "post", fasted: "0" });
    await appDb.customRecords.put(back);
    // After the fields are restored, saving keeps the values with their types.
    await updateCustomRecord(protein, { ...back, values: { ...back.values, brand: "X" } });
    expect((await appDb.customRecords.get(rec.id))?.values).toEqual({
      amount: 30,
      timing: ["post"],
      fasted: false,
      brand: "X",
    });
  });

  it("clearAll records tombstones only for its tab", async () => {
    const p = await addCustomRecord(protein, input({ amount: 1 }));
    const m = await addCustomRecord(meal, input({ amount: 2 }));
    await createCustomModuleData(typeOf(protein)).clearAll();
    expect((await appDb.customRecords.toArray()).map((r) => r.id)).toEqual([m.id]);
    expect((await appDb.tombstones.toArray()).map((t) => [t.table, t.id])).toEqual([["Custom_protein", `Custom_protein:${p.id}`]]);
  });

  it("names the csv of a built-in type after its id", () => {
    const body = builtinDefinition("body");
    const data = createCustomModuleData({ id: "body", definition: body, deleted: false, updatedAt: "" });
    expect(data.csv.fileName).toBe("body.csv");
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

describe("endedAt", () => {
  const bath = { ...def("bath"), hasEnd: true as const };
  const endIso = "2026-11-26T10:30:00+09:00";
  const cfg = (d: CustomRecordDefinition) => createCustomModuleData(typeOf(d)).syncConfigs[0];

  it("endedAt column appears for hasEnd definitions", () => {
    const headers = cfg(bath).buildHeaders!([]);
    expect(headers[headers.indexOf("recordedAt") + 1]).toBe("endedAt");
  });

  it("no endedAt column without hasEnd and without stored endedAt", async () => {
    const rec = await addCustomRecord(meal, input({ amount: 1 }));
    expect(cfg(meal).buildHeaders!([rec])).not.toContain("endedAt");
  });

  it("endedAt column kept when a record has endedAt but the definition dropped hasEnd", async () => {
    const rec = await addCustomRecord(bath, { ...input({ amount: 1 }), endedAt: endIso });
    const headers = cfg(meal).buildHeaders!([rec]);
    expect(headers[headers.indexOf("recordedAt") + 1]).toBe("endedAt");
    expect(cfg(meal).fromRow(cfg(meal).toRow(rec, headers), headers)).toEqual({ ...rec, typeId: "meal" });
  });

  it("fromRow reads endedAt", async () => {
    const rec = await addCustomRecord(bath, { ...input({ amount: 1 }), endedAt: endIso });
    expect(rec.endedAt).toBe(endIso);
    const c = cfg(bath);
    const headers = c.buildHeaders!([rec]);
    expect(c.fromRow(c.toRow(rec, headers), headers)).toEqual(rec);
  });

  it("empty endedAt cell gives no property", async () => {
    const rec = await addCustomRecord(bath, input({ amount: 1 }));
    expect("endedAt" in rec).toBe(false);
    const c = cfg(bath);
    const headers = c.buildHeaders!([rec]);
    const back = c.fromRow(c.toRow(rec, headers), headers) as typeof rec;
    expect("endedAt" in back).toBe(false);
  });

  it("sheet without endedAt column gives no property", () => {
    const c = cfg(bath);
    const headers = ["id", "date", "recordedAt", "note", "updatedAt"];
    const back = c.fromRow(["a", day, at, "", ""], headers) as { endedAt?: string };
    expect("endedAt" in back).toBe(false);
  });

  it("endedAt never lands in values", async () => {
    const rec = await addCustomRecord(bath, { ...input({ amount: 1 }), endedAt: endIso });
    const c = cfg(meal);
    const headers = c.buildHeaders!([rec]);
    const back = c.fromRow(c.toRow(rec, headers), headers) as typeof rec;
    expect(Object.keys(back.values)).not.toContain("endedAt");
  });

  it("csv has endedAt column formatted like recordedAt for hasEnd", async () => {
    await addCustomRecord(bath, { ...input({ amount: 1 }), endedAt: endIso });
    await addCustomRecord(bath, input({ amount: 2 }));
    const csv = await createCustomModuleData(typeOf(bath)).csv.generate();
    const lines = csv.split("\n");
    expect(lines[0]).toContain("recordedAt,endedAt,note");
    expect(csv).toContain(formatTimestampForCsv(endIso));
    expect(csv).toContain(formatTimestampForCsv(at) + ",,");
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
