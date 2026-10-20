import Dexie, { type EntityTable } from "dexie";

import type {
  DailyMetricEntry,
  DailySelfCareEntry,
  DailyWellnessEntry,
  ExerciseLog,
  ExerciseVideo,
  LegacyExerciseLog,
  SelfCareItem,
  Tombstone,
  WatchEvent,
  WellnessEntry,
} from "@/lib/types";

export class AppDb extends Dexie {
  /** Legacy one-log-per-day table; removed in a later schema version. */
  logs!: EntityTable<LegacyExerciseLog, "id">;
  exerciseLogs!: EntityTable<ExerciseLog, "id">;
  wellnessEntries!: EntityTable<WellnessEntry, "id">;
  watchEvents!: EntityTable<WatchEvent, "id">;
  tombstones!: EntityTable<Tombstone, "id">;
  exercises!: EntityTable<ExerciseVideo, "id">;
  /** Legacy one-entry-per-day table; removed in a later schema version. */
  dailyWellness!: EntityTable<DailyWellnessEntry, "date">;
  dailyMetrics!: EntityTable<DailyMetricEntry, "id">;
  selfCareCatalog!: EntityTable<SelfCareItem, "id">;
  dailySelfCareLogs!: EntityTable<DailySelfCareEntry, "id">;
  googleAuth!: EntityTable<{ key: string; value: string }, "key">;

  constructor() {
    super("exercise-log-mvp");

    this.version(1).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: "date, conditionLevel, note, updatedAt",
      exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
    });

    this.version(2).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: "date, conditionLevel, note, updatedAt",
      exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
      dailyWellness: "date, physicalScore, mentalScore, updatedAt",
      dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
    });

    this.version(3)
      .stores({
        logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
        conditions: "date, conditionLevel, note, updatedAt",
        exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
        dailyWellness: "date, physicalScore, mentalScore, updatedAt",
        dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
        selfCareCatalog: "id, sortOrder, isArchived",
        dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      })
      .upgrade(async (tx) => {
        await tx.table("dailyWellness").toCollection().modify((entry) => {
          if (typeof entry.note !== "string") {
            entry.note = "";
          }
        });
      });

    this.version(4)
      .stores({
        logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
        conditions: "date, conditionLevel, note, updatedAt",
        exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
        dailyWellness: "date, physicalScore, mentalScore, updatedAt",
        dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
        selfCareCatalog: "id, sortOrder, isArchived",
        dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      })
      .upgrade(async (tx) => {
        await tx.table("logs").where("result").equals("could_not").delete();
      });

    this.version(5).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: "date, conditionLevel, note, updatedAt",
      exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
      dailyWellness: "date, physicalScore, mentalScore, updatedAt",
      dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
    });

    this.version(6).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: null,
      exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
      dailyWellness: "date, physicalScore, mentalScore, updatedAt",
      dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
    });

    // v7: multi-entry timeline records + tombstones. No data migration: old
    // records are discarded and the exercise catalog is emptied so the seed
    // prompt re-inserts it with durations in seconds.
    this.version(7)
      .stores({
        logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
        exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
        dailyWellness: "date, physicalScore, mentalScore, updatedAt",
        dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
        selfCareCatalog: "id, sortOrder, isArchived",
        dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
        googleAuth: "key",
        exerciseLogs: "id, date, exerciseId, performedAt",
        wellnessEntries: "id, date, recordedAt",
        watchEvents: "id, date, exerciseId, watchedAt",
        tombstones: "id, table",
      })
      .upgrade(async (tx) => {
        await Promise.all([
          tx.table("logs").clear(),
          tx.table("dailyWellness").clear(),
          tx.table("dailyMetrics").clear(),
          tx.table("dailySelfCareLogs").clear(),
          tx.table("exercises").clear(),
        ]);
      });
  }
}

export const appDb = new AppDb();
