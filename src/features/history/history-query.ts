import { recordModuleData } from "@/features/modules/data-registry";
import { appDb } from "@/features/storage/app-db";

/**
 * "exercise": at least one exercise log that day. "record": no exercise, but a watch or a
 * record of an enabled module.
 */
export type CalendarMark = "exercise" | "record";

/**
 * Calendar marks keyed by day (`YYYY-MM-DD`) for the given month (`YYYY-MM`).
 * Only modules in `enabledModuleIds` mark days.
 */
export async function listCalendarMarksInMonth(
  month: string,
  enabledModuleIds: readonly string[],
): Promise<Record<string, CalendarMark>> {
  const enabled = recordModuleData().filter((m) => enabledModuleIds.includes(m.id));
  const [logs, watches, ...moduleDates] = await Promise.all([
    appDb.exerciseLogs.where("date").startsWith(month).toArray(),
    appDb.watchEvents.where("date").startsWith(month).toArray(),
    ...enabled.map((m) => m.datesWithRecordsInMonth(month)),
  ]);

  const marks: Record<string, CalendarMark> = {};
  for (const watch of watches) {
    marks[watch.date] = "record";
  }
  for (const dates of moduleDates) {
    for (const date of dates) marks[date] = "record";
  }
  for (const log of logs) {
    marks[log.date] = "exercise";
  }
  return marks;
}
