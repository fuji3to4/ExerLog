/** Map of sheet tab name → { keyColumn, headers, readFromDb, toRow, fromRow, clearDb, bulkWriteDb } */
export interface TableSyncConfig {
  keyColumn: string;
  headers: string[];
  readFromDb: () => Promise<any[]>;
  toRow: (record: any) => string[];
  fromRow: (row: string[], headers: string[]) => any;
  clearDb: () => Promise<void>;
  bulkWriteDb: (records: any[]) => Promise<void>;
}

import type {
  ExerciseLog,
  ExerciseVideo,
  DailyWellnessEntry,
  DailyMetricEntry,
  DailySelfCareEntry,
  SelfCareItem,
  ExerciseLogResult,
  WellnessScore,
  MetricType,
  ExerciseIntensity,
} from "@/lib/types";
import { appDb } from "@/features/storage/app-db";

export const TABLE_SYNC_CONFIGS: TableSyncConfig[] = [
  {
    // ExerciseLogs
    keyColumn: "id",
    headers: ["id", "date", "exerciseId", "result", "loggedAt"],
    readFromDb: () => appDb.logs.toArray(),
    toRow: (r) => [r.id, r.date, r.exerciseId, r.result, r.loggedAt],
    fromRow: (row, headers) => ({
      id: String(row[headers.indexOf("id")]),
      date: row[headers.indexOf("date")],
      exerciseId: row[headers.indexOf("exerciseId")],
      result: row[headers.indexOf("result")] as ExerciseLogResult,
      loggedAt: row[headers.indexOf("loggedAt")],
    }),
    clearDb: () => appDb.logs.clear(),
    bulkWriteDb: (records) => appDb.logs.bulkPut(records as ExerciseLog[]),
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
    fromRow: (row, headers) => ({
      date: row[headers.indexOf("date")],
      physicalScore: Number(row[headers.indexOf("physicalScore")]) as WellnessScore,
      mentalScore: Number(row[headers.indexOf("mentalScore")]) as WellnessScore,
      note: row[headers.indexOf("note")] ?? "",
      updatedAt: row[headers.indexOf("updatedAt")],
    }),
    clearDb: () => appDb.dailyWellness.clear(),
    bulkWriteDb: (records) => appDb.dailyWellness.bulkPut(records as DailyWellnessEntry[]),
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
    fromRow: (row, headers) => ({
      id: String(row[headers.indexOf("id")]),
      date: row[headers.indexOf("date")],
      metricType: row[headers.indexOf("metricType")] as MetricType,
      value: Number(row[headers.indexOf("value")]),
      unit: row[headers.indexOf("unit")],
      recordedAt: row[headers.indexOf("recordedAt")],
    }),
    clearDb: () => appDb.dailyMetrics.clear(),
    bulkWriteDb: (records) => appDb.dailyMetrics.bulkPut(records as DailyMetricEntry[]),
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
    fromRow: (row, headers) => {
      const ci = (col: string) => headers.indexOf(col);
      const rawCount = row[ci("count")];
      const rawMinutes = row[ci("minutes")];
      return {
        id: String(row[ci("id")]),
        date: row[ci("date")],
        selfCareId: row[ci("selfCareId")],
        isDone: row[ci("isDone")] === "TRUE",
        count: rawCount ? Number(rawCount) : null,
        minutes: rawMinutes ? Number(rawMinutes) : null,
        note: row[ci("note")] ?? "",
        recordedAt: row[ci("recordedAt")],
      };
    },
    clearDb: () => appDb.dailySelfCareLogs.clear(),
    bulkWriteDb: (records) => appDb.dailySelfCareLogs.bulkPut(records as DailySelfCareEntry[]),
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
    fromRow: (row, headers) => ({
      id: row[headers.indexOf("id")],
      title: row[headers.indexOf("title")],
      description: row[headers.indexOf("description")] ?? "",
      videoUrl: row[headers.indexOf("videoUrl")],
      thumbnailUrl: row[headers.indexOf("thumbnailUrl")] ?? "",
      bodyArea: row[headers.indexOf("bodyArea")],
      purpose: row[headers.indexOf("purpose")],
      durationMinutes: Number(row[headers.indexOf("durationMinutes")]),
      intensity: row[headers.indexOf("intensity")] as ExerciseIntensity,
    }),
    clearDb: () => appDb.exercises.clear(),
    bulkWriteDb: (records) => appDb.exercises.bulkPut(records as ExerciseVideo[]),
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
    fromRow: (row, headers) => ({
      id: row[headers.indexOf("id")],
      title: row[headers.indexOf("title")],
      description: row[headers.indexOf("description")] ?? "",
      sortOrder: Number(row[headers.indexOf("sortOrder")]),
      isArchived: row[headers.indexOf("isArchived")] === "TRUE",
    }),
    clearDb: () => appDb.selfCareCatalog.clear(),
    bulkWriteDb: (records) => appDb.selfCareCatalog.bulkPut(records as SelfCareItem[]),
  },
];