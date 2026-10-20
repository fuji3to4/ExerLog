import { listDailyMetricsByDate } from "@/features/storage/daily-metrics.repository";
import { listDailySelfCareEntriesByDate } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { listAllSelfCareItems } from "@/features/storage/self-care-catalog.repository";
import type { MetricType } from "@/lib/types";

/** "exercise": at least one exercise log that day. "record": no exercise, but a wellness entry or a watch. */
export type CalendarMark = "exercise" | "record";

type HistoryDayMetric = {
  metricType: MetricType;
  value: number;
  unit: string;
};

type HistoryDaySelfCareLog = {
  selfCareId: string;
  title: string;
  isDone: boolean;
  count: number | null;
  minutes: number | null;
  note: string;
};

export type HistoryDaySummary = {
  metrics: HistoryDayMetric[];
  selfCareLogs: HistoryDaySelfCareLog[];
};

/** Calendar marks keyed by day (`YYYY-MM-DD`) for the given month (`YYYY-MM`). */
export async function listCalendarMarksInMonth(month: string): Promise<Record<string, CalendarMark>> {
  const [logs, wellness, watches] = await Promise.all([
    appDb.exerciseLogs.where("date").startsWith(month).toArray(),
    appDb.wellnessEntries.where("date").startsWith(month).toArray(),
    appDb.watchEvents.where("date").startsWith(month).toArray(),
  ]);

  const marks: Record<string, CalendarMark> = {};
  for (const entry of [...wellness, ...watches]) {
    marks[entry.date] = "record";
  }
  for (const log of logs) {
    marks[log.date] = "exercise";
  }
  return marks;
}

export async function getHistoryDaySummary(date: string): Promise<HistoryDaySummary> {
  const [metrics, selfCareLogs, selfCareItems] = await Promise.all([
    listDailyMetricsByDate(date),
    listDailySelfCareEntriesByDate(date),
    listAllSelfCareItems(),
  ]);

  const selfCareTitleMap = new Map(selfCareItems.map((item) => [item.id, item.title]));

  return {
    metrics: metrics.map((metric) => ({
      metricType: metric.metricType,
      value: metric.value,
      unit: metric.unit,
    })),
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
