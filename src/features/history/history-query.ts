import { listDailySelfCareEntriesByDate } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { listAllSelfCareItems } from "@/features/storage/self-care-catalog.repository";

/** "exercise": at least one exercise log that day. "record": no exercise, but a wellness entry, a watch or a body measurement. */
export type CalendarMark = "exercise" | "record";

type HistoryDaySelfCareLog = {
  selfCareId: string;
  title: string;
  isDone: boolean;
  count: number | null;
  minutes: number | null;
  note: string;
};

export type HistoryDaySummary = {
  selfCareLogs: HistoryDaySelfCareLog[];
};

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

export async function getHistoryDaySummary(date: string): Promise<HistoryDaySummary> {
  const [selfCareLogs, selfCareItems] = await Promise.all([
    listDailySelfCareEntriesByDate(date),
    listAllSelfCareItems(),
  ]);

  const selfCareTitleMap = new Map(selfCareItems.map((item) => [item.id, item.title]));

  return {
    selfCareLogs: selfCareLogs.map((entry) => ({
      selfCareId: entry.selfCareId,
      title: selfCareTitleMap.get(entry.selfCareId) ?? entry.selfCareId,
      isDone: entry.isDone,
      count: entry.count,
      minutes: entry.minutes,
      note: entry.note,
    })),
  };
}
