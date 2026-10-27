import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import Dexie from "dexie";
import { bodyRepository } from "@/features/modules/body/data";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { AppDb, appDb } from "./app-db";
import { addExerciseLog } from "./exercise-logs.repository";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { recordWatchEvent } from "./watch-events.repository";
import { clearAllRecords, countAllRecords } from "./clear-all-records";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.bodyRecords.clear(),
    appDb.circumferenceRecords.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("clearAllRecords", () => {
  test("empties the three record tables and tombstones every deleted id", async () => {
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "did", durationSeconds: 330 });
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "partial", durationSeconds: 60 });
    await addWellnessEntry({ date: "2026-10-20", physicalScore: 3, mentalScore: 4, note: "" });
    await recordWatchEvent({ date: "2026-10-20", exerciseId: "a" });
    await bodyRepository.add({ date: "2026-10-20", values: { weight: 60 }, note: "" });
    await circumferenceRepository.add({ date: "2026-10-20", values: { armWristLeft: 15 }, note: "" });

    expect(await countAllRecords()).toBe(6);
    const ids = {
      ExerciseLogs: await appDb.exerciseLogs.toCollection().primaryKeys(),
      WellnessEntries: await appDb.wellnessEntries.toCollection().primaryKeys(),
      WatchEvents: await appDb.watchEvents.toCollection().primaryKeys(),
      BodyMeasurements: await appDb.bodyRecords.toCollection().primaryKeys(),
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
  test("drops measurements, adds empty body and circumference tables, keeps wellness entries", async () => {
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
      expect(upgraded.verno).toBe(11);
      expect(upgraded.tables.map((table) => table.name)).not.toContain("measurements");
      expect(await upgraded.bodyRecords.count()).toBe(0);
      expect(await upgraded.circumferenceRecords.count()).toBe(0);
      expect(await upgraded.wellnessEntries.count()).toBe(1);
    } finally {
      upgraded.close();
      await appDb.open();
    }
  });
});
