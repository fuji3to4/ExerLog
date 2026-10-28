import Dexie, { type EntityTable, type Table } from "dexie";

import type {
  CompressionRecord,
  ExerciseLog,
  ExerciseVideo,
  MeasurementRecord,
  PhotoBlob,
  PhotoFile,
  PhotoRecord,
  PhotoTrashItem,
  SelfCareRecord,
  SymptomRecord,
  Tombstone,
  WatchEvent,
  WellnessEntry,
} from "@/lib/types";

export class AppDb extends Dexie {
  exerciseLogs!: EntityTable<ExerciseLog, "id">;
  wellnessEntries!: EntityTable<WellnessEntry, "id">;
  bodyRecords!: Table<MeasurementRecord, string>;
  circumferenceRecords!: Table<MeasurementRecord, string>;
  watchEvents!: EntityTable<WatchEvent, "id">;
  photoRecords!: EntityTable<PhotoRecord, "id">;
  photoBlobs!: EntityTable<PhotoBlob, "id">;
  photoFiles!: EntityTable<PhotoFile, "id">;
  photoTrash!: EntityTable<PhotoTrashItem, "driveFileId">;
  tombstones!: EntityTable<Tombstone, "id">;
  exercises!: EntityTable<ExerciseVideo, "id">;
  selfCareRecords!: EntityTable<SelfCareRecord, "id">;
  compressionRecords!: EntityTable<CompressionRecord, "id">;
  symptomRecords!: EntityTable<SymptomRecord, "id">;
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

    // v8: drop the legacy one-per-day tables (superseded by exerciseLogs / wellnessEntries).
    this.version(8).stores({
      logs: null,
      dailyWellness: null,
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
    });

    // v9: timed body measurements.
    this.version(9).stores({
      dailyMetrics: "id, date, metricType, recordedAt, &[date+metricType]",
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

    // v10: drop the legacy dailyMetrics table (superseded by measurements). No data migration.
    this.version(10).stores({
      dailyMetrics: null,
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

    // v11: body and circumference records get their own tables. No data migration:
    // old measurements are discarded; every other table is left as it is.
    this.version(11).stores({
      selfCareCatalog: "id, sortOrder, isArchived",
      dailySelfCareLogs: "id, date, selfCareId, recordedAt, &[date+selfCareId]",
      googleAuth: "key",
      exerciseLogs: "id, date, exerciseId, performedAt",
      wellnessEntries: "id, date, recordedAt",
      watchEvents: "id, date, exerciseId, watchedAt",
      tombstones: "id, table",
      exercises: "id, title, bodyArea, purpose, durationSeconds, intensity",
      measurements: null,
      bodyRecords: "id, date, recordedAt",
      circumferenceRecords: "id, date, recordedAt",
    });

    // v12: photo records, their local blobs, the Drive file map and the Drive trash queue.
    this.version(12).stores({
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

    // v13: drop the placeholder self-care tables (no data migration) and add the
    // self-care, compression wear and symptom record tables.
    this.version(13).stores({
      selfCareCatalog: null,
      dailySelfCareLogs: null,
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
      selfCareRecords: "id, date, recordedAt",
      compressionRecords: "id, date, recordedAt, kind",
      symptomRecords: "id, date, recordedAt",
    });
  }
}

export const appDb = new AppDb();
