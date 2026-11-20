import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { builtinDefinition } from "@/features/modules/custom/builtin";
import type { CustomField } from "@/features/modules/custom/definition";
import { loadCustomTypes } from "@/features/modules/custom/type-store";
import { appDb } from "@/features/storage/app-db";
import type { CustomValue } from "@/lib/types";

import { getLatestConditionScores } from "./condition";

async function seedWellness(recordedAt: string, values: Record<string, CustomValue>, id = recordedAt) {
  await appDb.customRecords.put({ id, typeId: "wellness", date: recordedAt.slice(0, 10), recordedAt, values, note: "", updatedAt: recordedAt });
}

/** Stores a customized wellness definition (a non-seed updatedAt keeps it from being reseeded). */
async function customize(edit: (fields: CustomField[]) => CustomField[]) {
  const def = builtinDefinition("wellness");
  await appDb.customRecordTypes.put({
    id: "wellness",
    definition: { ...def, fields: edit(def.fields.map((f) => ({ ...f }))) },
    deleted: false,
    updatedAt: "2026-01-01T00:00:00+09:00",
  });
  await loadCustomTypes();
}

beforeEach(async () => {
  await Promise.all([appDb.customRecords.clear(), appDb.customRecordTypes.clear()]);
  await loadCustomTypes();
});

test("returns null when the day has no wellness record", async () => {
  expect(await getLatestConditionScores("2026-10-20")).toBeNull();
});

test("returns the scores of a record made with the default definition", async () => {
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 4, mental: 2 });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 4, mentalScore: 2 });
});

test("uses the later record when the day has two", async () => {
  await seedWellness("2026-10-20T19:00:00+09:00", { physical: 1, mental: 2 });
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 5, mental: 5 });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 1, mentalScore: 2 });
});

test("returns null when the definition has no physical scale field", async () => {
  await customize((fields) => fields.filter((f) => f.id !== "physical"));
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 4, mental: 2 });

  expect(await getLatestConditionScores("2026-10-20")).toBeNull();
});

test("returns null when the record lacks one of the two values", async () => {
  await seedWellness("2026-10-20T07:00:00+09:00", { mental: 2 });

  expect(await getLatestConditionScores("2026-10-20")).toBeNull();
});

test("converts a 10-level scale to 1-5", async () => {
  await customize((fields) => fields.map((f) => (f.type === "scale" ? { ...f, levels: 10 } : f)));
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 10, mental: 1 });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 5, mentalScore: 1 });
});

test("still returns scores when only an extra field was added", async () => {
  await customize((fields) => [...fields, { id: "appetite", label: "Appetite", type: "scale", required: false, levels: 5 }]);
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 3, mental: 4, appetite: 2 });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 3, mentalScore: 4 });
});

test("reads values that arrived as strings from the sheet", async () => {
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: "4", mental: "2" } as unknown as Record<string, CustomValue>);

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 4, mentalScore: 2 });
});

test("orders records by instant when offsets differ", async () => {
  // 09:30Z is later than 10:00+09:00 (01:00Z) although it sorts earlier as a string.
  await seedWellness("2026-10-20T10:00:00+09:00", { physical: 1, mental: 1 }, "a");
  await seedWellness("2026-10-20T09:30:00Z", { physical: 5, mental: 5 }, "b");

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 5, mentalScore: 5 });
});

test("rounds a non-integer value on a 5-level scale", async () => {
  await seedWellness("2026-10-20T07:00:00+09:00", { physical: 2.6, mental: 1.2 });

  expect(await getLatestConditionScores("2026-10-20")).toEqual({ physicalScore: 3, mentalScore: 1 });
});
