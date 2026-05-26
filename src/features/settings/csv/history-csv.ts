import type {
  DailyConditionEntry,
  DailyMetricEntry,
  DailyWellnessEntry,
  ExerciseLog,
} from "@/lib/types";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateExerciseLogsCsv(logs: ExerciseLog[], exerciseTitleMap: Map<string, string>): string {
  const headers = ["date", "exerciseId", "exerciseTitle", "result", "loggedAt"];
  const rows = [
    headers.join(","),
    ...logs.map((log) =>
      [log.date, log.exerciseId, exerciseTitleMap.get(log.exerciseId) ?? log.exerciseId, log.result, formatTimestampForCsv(log.loggedAt)]
        .map(escapeCsvField)
        .join(","),
    ),
  ];
  return rows.join("\n");
}

export function generateDailyWellnessCsv(entries: DailyWellnessEntry[]): string {
  const headers = ["date", "physicalScore", "mentalScore", "note", "updatedAt"];
  const rows = [
    headers.join(","),
    ...entries.map((entry) =>
      [
        entry.date,
        entry.physicalScore,
        entry.mentalScore,
        entry.note,
        formatTimestampForCsv(entry.updatedAt),
      ].map(escapeCsvField).join(","),
    ),
  ];
  return rows.join("\n");
}

export function generateDailyMetricsCsv(entries: DailyMetricEntry[]): string {
  const headers = ["date", "metricType", "value", "unit", "recordedAt"];
  const rows = [
    headers.join(","),
    ...entries.map((entry) =>
      [
        entry.date,
        entry.metricType,
        entry.value,
        entry.unit,
        formatTimestampForCsv(entry.recordedAt),
      ].map(escapeCsvField).join(","),
    ),
  ];
  return rows.join("\n");
}

export function generateConditionsCsv(conditions: DailyConditionEntry[]): string {
  const headers = ["date", "conditionLevel", "note", "updatedAt"];
  const rows = [
    headers.join(","),
    ...conditions.map((c) =>
      [c.date, c.conditionLevel, c.note, formatTimestampForCsv(c.updatedAt)].map(escapeCsvField).join(","),
    ),
  ];
  return rows.join("\n");
}
