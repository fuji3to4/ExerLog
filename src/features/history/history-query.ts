import { appDb } from "@/features/storage/app-db";

/** "exercise": at least one exercise log that day. "record": no exercise, but a wellness entry, a watch or a body measurement. */
export type CalendarMark = "exercise" | "record";

/** Calendar marks keyed by day (`YYYY-MM-DD`) for the given month (`YYYY-MM`). */
export async function listCalendarMarksInMonth(month: string): Promise<Record<string, CalendarMark>> {
  const [logs, wellness, watches, measurements] = await Promise.all([
    appDb.exerciseLogs.where("date").startsWith(month).toArray(),
    appDb.wellnessEntries.where("date").startsWith(month).toArray(),
    appDb.watchEvents.where("date").startsWith(month).toArray(),
    appDb.measurements.where("date").startsWith(month).toArray(),
  ]);

  const marks: Record<string, CalendarMark> = {};
  for (const entry of [...wellness, ...watches, ...measurements]) {
    marks[entry.date] = "record";
  }
  for (const log of logs) {
    marks[log.date] = "exercise";
  }
  return marks;
}
