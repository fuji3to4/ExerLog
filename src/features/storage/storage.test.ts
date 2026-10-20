import { describe, test, expect, beforeEach } from "vitest";
import { appDb } from "./app-db";
import { addExerciseLog } from "./exercise-logs.repository";
import { addWellnessEntry } from "./wellness-entries.repository";
import { recordWatchEvent } from "./watch-events.repository";
import { clearAllRecords, countAllRecords } from "./clear-all-records";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
  ]);
});

describe("clearAllRecords", () => {
  test("empties the three record tables and tombstones every deleted id", async () => {
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "did", durationSeconds: 330 });
    await addExerciseLog({ date: "2026-10-20", exerciseId: "a", result: "partial", durationSeconds: 60 });
    await addWellnessEntry({ date: "2026-10-20", physicalScore: 3, mentalScore: 4, note: "" });
    await recordWatchEvent({ date: "2026-10-20", exerciseId: "a" });

    expect(await countAllRecords()).toBe(4);
    const ids = {
      ExerciseLogs: await appDb.exerciseLogs.toCollection().primaryKeys(),
      WellnessEntries: await appDb.wellnessEntries.toCollection().primaryKeys(),
      WatchEvents: await appDb.watchEvents.toCollection().primaryKeys(),
    };

    await clearAllRecords();

    expect(await countAllRecords()).toBe(0);
    const tombstones = await appDb.tombstones.toArray();
    expect(tombstones).toHaveLength(4);
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
