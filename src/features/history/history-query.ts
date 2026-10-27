import { appDb } from "@/features/storage/app-db";

/**
 * "exercise": at least one exercise log that day. "record": no exercise, but a wellness entry,
 * a watch, a body record or a circumference record.
 */
export type CalendarMark = "exercise" | "record";

/** Calendar marks keyed by day (`YYYY-MM-DD`) for the given month (`YYYY-MM`). */
export async function listCalendarMarksInMonth(month: string): Promise<Record<string, CalendarMark>> {
  const [logs, wellness, watches, body, circumference] = await Promise.all([
    appDb.exerciseLogs.where("date").startsWith(month).toArray(),
    appDb.wellnessEntries.where("date").startsWith(month).toArray(),
    appDb.watchEvents.where("date").startsWith(month).toArray(),
    appDb.bodyRecords.where("date").startsWith(month).toArray(),
    appDb.circumferenceRecords.where("date").startsWith(month).toArray(),
  ]);

  const marks: Record<string, CalendarMark> = {};
  for (const entry of [...wellness, ...watches, ...body, ...circumference]) {
    marks[entry.date] = "record";
  }
  for (const log of logs) {
    marks[log.date] = "exercise";
  }
  return marks;
}
