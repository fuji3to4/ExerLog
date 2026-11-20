import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import Dexie from "dexie";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { builtinDefinition } from "@/features/modules/custom/builtin";
import { addCustomRecord } from "@/features/modules/custom/data";
import { AppDb, appDb } from "./app-db";
import { addExerciseLog } from "./exercise-logs.repository";
import { recordWatchEvent } from "./watch-events.repository";
import { clearAllRecords, countAllRecords } from "./clear-all-records";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.customRecords.clear(),
    appDb.watchEvents.clear(),
    appDb.circumferenceRecords.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("clearAllRecords", () => {
  test("empties the record tables and tombstones every deleted id", async () => {
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "did", durationSeconds: 330 });
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "partial", durationSeconds: 60 });
    const at = { date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", note: "" };
    const wellness = await addCustomRecord(builtinDefinition("wellness"), { ...at, values: { physical: 3, mental: 4 } });
    await recordWatchEvent({ date: "2026-10-20", exerciseId: "a" });
    const body = await addCustomRecord(builtinDefinition("body"), { ...at, values: { weight: 60 } });
    await circumferenceRepository.add({ date: "2026-10-20", values: { armWristLeft: 15 }, note: "" });

    expect(await countAllRecords()).toBe(6);
    const ids = {
      ExerciseLogs: await appDb.exerciseLogs.toCollection().primaryKeys(),
      Custom_wellness: [wellness.id],
      WatchEvents: await appDb.watchEvents.toCollection().primaryKeys(),
      Custom_body: [body.id],
      Circumference: await appDb.circumferenceRecords.toCollection().primaryKeys(),
    };

    await clearAllRecords();

    expect(await countAllRecords()).toBe(0);
    const tombstones = await appDb.tombstones.toArray();
    expect(tombstones).toHaveLength(6);
    for (const [table, list] of Object.entries(ids)) {
      for (const id of list) {
        expect(tombstones).toContainEqual(
          expect.objectContaining({ id: `${table}:${id}`, table, recordId: id }),
        );
      }
    }
  });
});

describe("googleAuth table", () => {
  beforeEach(async () => {
    await appDb.googleAuth.clear();
  });

  test("stores and retrieves key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "test_key", value: "test_value" });
    const result = await appDb.googleAuth.get("test_key");
    expect(result?.value).toBe("test_value");
  });

  test("deletes key-value pairs", async () => {
    await appDb.googleAuth.put({ key: "to_delete", value: "data" });
    await appDb.googleAuth.delete("to_delete");
    const result = await appDb.googleAuth.get("to_delete");
    expect(result).toBeUndefined();
  });
});

describe("v11 upgrade", () => {
  test("drops measurements and adds an empty circumference table", async () => {
    appDb.close();
    await Dexie.delete("exercise-log-mvp");

    const v10 = new Dexie("exercise-log-mvp");
    v10.version(10).stores({
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      measurements: "id, date, recordedAt",
    });
    await v10.table("measurements").add({
      id: "m-1",
      date: "2026-10-20",
      recordedAt: "2026-10-20T07:00:00+09:00",
      values: { weight: 60, armWristLeft: 15 },
      note: "",
      updatedAt: "2026-10-20T07:00:00+09:00",
    });
    await v10.table("wellnessEntries").add({
      id: "w-1",
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      physicalScore: 3,
      mentalScore: 4,
      note: "",
      updatedAt: "2026-10-20T08:00:00+09:00",
    });
    v10.close();

    const upgraded = new AppDb();
    try {
      await upgraded.open();
      expect(upgraded.verno).toBeGreaterThanOrEqual(12);
      expect(upgraded.tables.map((table) => table.name)).not.toContain("measurements");
      expect(await upgraded.circumferenceRecords.count()).toBe(0);
    } finally {
      upgraded.close();
      await appDb.open();
    }
  });
});

describe("v12 upgrade", () => {
  test("opens v12 with photoRecords, photoBlobs, photoFiles and photoTrash, keeping existing tables", async () => {
    appDb.close();
    await Dexie.delete("exercise-log-mvp");

    const v11 = new Dexie("exercise-log-mvp");
    v11.version(11).stores({
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      bodyRecords: "id, date, recordedAt",
      circumferenceRecords: "id, date, recordedAt",
    });
    await v11.table("circumferenceRecords").add({
      id: "b-1",
      date: "2026-10-20",
      recordedAt: "2026-10-20T07:00:00+09:00",
      values: { armWristLeft: 15 },
      note: "",
      updatedAt: "2026-10-20T07:00:00+09:00",
    });
    v11.close();

    const upgraded = new AppDb();
    try {
      await upgraded.open();
      expect(upgraded.verno).toBeGreaterThanOrEqual(12);
      const names = upgraded.tables.map((table) => table.name);
      expect(names).toEqual(expect.arrayContaining(["photoRecords", "photoBlobs", "photoFiles", "photoTrash"]));
      expect(await upgraded.photoRecords.count()).toBe(0);
      expect(await upgraded.circumferenceRecords.count()).toBe(1);
    } finally {
      upgraded.close();
      await appDb.open();
    }
  });
});

describe("v14 upgrade", () => {
  test("opens v14 with the new record tables and without the placeholder self-care tables", async () => {
    appDb.close();
    await Dexie.delete("exercise-log-mvp");

    const v12 = new Dexie("exercise-log-mvp");
    v12.version(12).stores({
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      bodyRecords: "id, date, recordedAt",
      circumferenceRecords: "id, date, recordedAt",
      photoRecords: "id, date, recordedAt",
      photoBlobs: "id, recordId",
      photoFiles: "id, recordId",
      photoTrash: "driveFileId",
    });
    await v12.table("dailySelfCareLogs").add({
      id: "s-1",
      date: "2026-10-20",
      selfCareId: "x",
      isDone: true,
      count: null,
      minutes: null,
      note: "",
      recordedAt: "2026-10-20T07:00:00+09:00",
    });
    v12.close();

    const upgraded = new AppDb();
    try {
      await upgraded.open();
      const names = upgraded.tables.map((table) => table.name);
      expect(names).toEqual(expect.arrayContaining(["compressionRecords", "symptomRecords", "listOrders"]));
      expect(names).not.toContain("dailySelfCareLogs");
      expect(names).not.toContain("selfCareCatalog");
    } finally {
      upgraded.close();
      await appDb.open();
    }
  });
});

describe("v18 upgrade", () => {
  test("drops the wellness, body, self-care and girth tables without migrating their rows", async () => {
    appDb.close();
    await Dexie.delete("exercise-log-mvp");

    const v17 = new Dexie("exercise-log-mvp");
    v17.version(17).stores({
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      bodyRecords: "id, date, recordedAt",
      girthRecords: "id, date, recordedAt",
      circumferenceRecords: "id, date, recordedAt",
      photoRecords: "id, date, recordedAt",
      photoBlobs: "id, recordId",
      photoFiles: "id, recordId",
      photoTrash: "driveFileId",
      selfCareRecords: "id, date, recordedAt",
      compressionRecords: "id, date, recordedAt, kind",
      symptomRecords: "id, date, recordedAt",
      exerciseSets: "id, createdAt",
      listOrders: "id",
      customRecords: "id, typeId, date, recordedAt, [typeId+date]",
      customRecordTypes: "id",
    });
    const row = { id: "x-1", date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", note: "", updatedAt: "2026-10-20T07:00:00+09:00" };
    for (const table of ["wellnessEntries", "bodyRecords", "selfCareRecords", "girthRecords", "circumferenceRecords"]) {
      await v17.table(table).add(row);
    }
    v17.close();

    const upgraded = new AppDb();
    try {
      await upgraded.open();
      expect(upgraded.verno).toBe(18);
      const names = upgraded.tables.map((table) => table.name);
      for (const dropped of ["wellnessEntries", "bodyRecords", "selfCareRecords", "girthRecords"]) {
        expect(names).not.toContain(dropped);
      }
      expect(await upgraded.circumferenceRecords.count()).toBe(1);
      expect(await upgraded.customRecords.count()).toBe(0);
    } finally {
      upgraded.close();
      await appDb.open();
    }
  });
});
