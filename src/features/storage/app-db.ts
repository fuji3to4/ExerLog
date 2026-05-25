import Dexie, { type EntityTable } from "dexie";

import type {
  DailyConditionEntry,
  DailyMetricEntry,
  DailySelfCareEntry,
  DailyWellnessEntry,
  ExerciseLog,
  ExerciseVideo,
  SelfCareItem,
} from "@/lib/types";

export class AppDb extends Dexie {
  logs!: EntityTable<ExerciseLog, "id">;
  conditions!: EntityTable<DailyConditionEntry, "date">;
  exercises!: EntityTable<ExerciseVideo, "id">;
  dailyWellness!: EntityTable<DailyWellnessEntry, "date">;
  dailyMetrics!: EntityTable<DailyMetricEntry, "id">;
  selfCareCatalog!: EntityTable<SelfCareItem, "id">;
  dailySelfCareLogs!: EntityTable<DailySelfCareEntry, "id">;

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
  }
}

export const appDb = new AppDb();
