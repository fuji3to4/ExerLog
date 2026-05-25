import { getDailyCondition } from "@/features/storage/daily-condition.repository";
import { listDailyMetricsByDate } from "@/features/storage/daily-metrics.repository";
import { listDailySelfCareEntriesByDate } from "@/features/storage/daily-self-care.repository";
import { getDailyWellness } from "@/features/storage/daily-wellness.repository";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { listAllSelfCareItems } from "@/features/storage/self-care-catalog.repository";
import type { MetricType } from "@/lib/types";

type HistoryDayLog = {
  id: string;
  exerciseId: string;
  title: string;
  result: "did" | "partial" | "could_not";
  loggedAt: string;
};

type HistoryDayWellness = {
  physicalScore: number;
  mentalScore: number;
};

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
  logs: HistoryDayLog[];
  conditionLevel: "good" | "okay" | "tired" | null;
  note: string;
  updatedAt: string | null;
  wellness: HistoryDayWellness | null;
  metrics: HistoryDayMetric[];
  selfCareLogs: HistoryDaySelfCareLog[];
};

export async function listCompletedDaysInMonth(month: string) {
  const monthLogs = await appDb.logs.where("date").startsWith(month).toArray();

  return [...new Set(monthLogs.map((entry) => entry.date))].sort();
}

export async function getHistoryDaySummary(date: string): Promise<HistoryDaySummary> {
  const [logs, condition, exercises, wellness, metrics, selfCareLogs, selfCareItems] = await Promise.all([
    listExerciseLogsForDay(date),
    getDailyCondition(date),
    listAllExercises(),
    getDailyWellness(date),
    listDailyMetricsByDate(date),
    listDailySelfCareEntriesByDate(date),
    listAllSelfCareItems(),
  ]);

  const exerciseTitleMap = new Map(exercises.map((e) => [e.id, e.title]));
  const selfCareTitleMap = new Map(selfCareItems.map((item) => [item.id, item.title]));

  return {
    logs: logs.map((log) => ({
      id: log.id,
      exerciseId: log.exerciseId,
      title: exerciseTitleMap.get(log.exerciseId) ?? log.exerciseId,
      result: log.result,
      loggedAt: log.loggedAt,
    })),
    conditionLevel: condition?.conditionLevel ?? null,
    note: condition?.note ?? "",
    updatedAt: condition?.updatedAt ?? null,
    wellness: wellness
      ? {
          physicalScore: wellness.physicalScore,
          mentalScore: wellness.mentalScore,
        }
      : null,
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
