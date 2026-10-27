import type { ExerciseLog, MeasurementRecord, WatchEvent, WellnessEntry } from "@/lib/types";
import type { MeasurementItem } from "@/features/measurements/measurement-items";
import { formatTimestampForCsv } from "@/lib/date/format-timestamp";

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers.join(","), ...rows.map((row) => row.map(escapeCsvField).join(","))].join("\n");
}

export function generateExerciseLogsCsv(logs: ExerciseLog[], exerciseTitleMap: Map<string, string>): string {
  return toCsv(
    ["date", "performedAt", "exerciseId", "exerciseTitle", "result", "durationSeconds"],
    logs.map((log) => [
      log.date,
      formatTimestampForCsv(log.performedAt),
      log.exerciseId,
      exerciseTitleMap.get(log.exerciseId) ?? log.exerciseId,
      log.result,
      log.durationSeconds,
    ]),
  );
}

export function generateWellnessEntriesCsv(entries: WellnessEntry[]): string {
  return toCsv(
    ["date", "recordedAt", "physicalScore", "mentalScore", "note"],
    entries.map((entry) => [
      entry.date,
      formatTimestampForCsv(entry.recordedAt),
      entry.physicalScore,
      entry.mentalScore,
      entry.note,
    ]),
  );
}

export function generateWatchEventsCsv(events: WatchEvent[], exerciseTitleMap: Map<string, string>): string {
  return toCsv(
    ["date", "watchedAt", "exerciseId", "exerciseTitle"],
    events.map((event) => [
      event.date,
      formatTimestampForCsv(event.watchedAt),
      event.exerciseId,
      exerciseTitleMap.get(event.exerciseId) ?? event.exerciseId,
    ]),
  );
}

/** One column per item of `items`, in order; values of other ids are left out. */
export function generateMeasurementsCsv(records: MeasurementRecord[], items: readonly MeasurementItem[]): string {
  return toCsv(
    ["date", "recordedAt", "note", ...items.map((item) => item.id)],
    records.map((record) => [
      record.date,
      formatTimestampForCsv(record.recordedAt),
      record.note,
      ...items.map((item) =>
        item.id in record.values ? String(record.values[item.id]) : "",
      ),
    ]),
  );
}
