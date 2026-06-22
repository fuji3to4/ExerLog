/** Map of sheet tab name → { keyColumn, headers, readFromDb } */
export interface TableSyncConfig {
  keyColumn: string;
  headers: string[];
  readFromDb: () => Promise<any[]>;
  toRow: (record: any) => string[];
}

import { appDb } from "@/features/storage/app-db";

export const TABLE_SYNC_CONFIGS: TableSyncConfig[] = [
  {
    // ExerciseLogs
    keyColumn: "id",
    headers: ["id", "date", "exerciseId", "result", "loggedAt"],
    readFromDb: () => appDb.logs.toArray(),
    toRow: (r) => [r.id, r.date, r.exerciseId, r.result, r.loggedAt],
  },
  {
    // DailyWellness
    keyColumn: "date",
    headers: ["date", "physicalScore", "mentalScore", "note", "updatedAt"],
    readFromDb: () => appDb.dailyWellness.toArray(),
    toRow: (r) => [
      r.date,
      String(r.physicalScore),
      String(r.mentalScore),
      r.note ?? "",
      r.updatedAt,
    ],
  },
  {
    // DailyMetrics
    keyColumn: "id",
    headers: ["id", "date", "metricType", "value", "unit", "recordedAt"],
    readFromDb: () => appDb.dailyMetrics.toArray(),
    toRow: (r) => [
      r.id,
      r.date,
      r.metricType,
      String(r.value),
      r.unit,
      r.recordedAt,
    ],
  },
  {
    // DailySelfCare
    keyColumn: "id",
    headers: [
      "id",
      "date",
      "selfCareId",
      "isDone",
      "count",
      "minutes",
      "note",
      "recordedAt",
    ],
    readFromDb: () => appDb.dailySelfCareLogs.toArray(),
    toRow: (r) => [
      r.id,
      r.date,
      r.selfCareId,
      r.isDone ? "TRUE" : "FALSE",
      r.count != null ? String(r.count) : "",
      r.minutes != null ? String(r.minutes) : "",
      r.note ?? "",
      r.recordedAt,
    ],
  },
  {
    // Exercises (master)
    keyColumn: "id",
    headers: [
      "id",
      "title",
      "description",
      "videoUrl",
      "thumbnailUrl",
      "bodyArea",
      "purpose",
      "durationMinutes",
      "intensity",
    ],
    readFromDb: () => appDb.exercises.toArray(),
    toRow: (r) => [
      r.id,
      r.title,
      r.description ?? "",
      r.videoUrl,
      r.thumbnailUrl ?? "",
      r.bodyArea,
      r.purpose,
      String(r.durationMinutes),
      r.intensity,
    ],
  },
  {
    // SelfCareCatalog (master)
    keyColumn: "id",
    headers: ["id", "title", "description", "sortOrder", "isArchived"],
    readFromDb: () => appDb.selfCareCatalog.toArray(),
    toRow: (r) => [
      r.id,
      r.title,
      r.description ?? "",
      String(r.sortOrder),
      r.isArchived ? "TRUE" : "FALSE",
    ],
  },
];