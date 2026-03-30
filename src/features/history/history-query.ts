import { getDailyCondition } from "@/features/storage/daily-condition.repository";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";

type HistoryDayLog = {
  id: string;
  exerciseId: string;
  title: string;
  result: "did" | "partial" | "could_not";
  loggedAt: string;
};

export type HistoryDaySummary = {
  logs: HistoryDayLog[];
  conditionLevel: "good" | "okay" | "tired" | null;
  note: string;
  updatedAt: string | null;
};

export async function listCompletedDaysInMonth(month: string) {
  const monthLogs = await appDb.logs.where("date").startsWith(month).toArray();

  return [...new Set(monthLogs.map((entry) => entry.date))].sort();
}

export async function getHistoryDaySummary(date: string): Promise<HistoryDaySummary> {
  const [logs, condition, exercises] = await Promise.all([
    listExerciseLogsForDay(date),
    getDailyCondition(date),
    listAllExercises(),
  ]);

  const exerciseTitleMap = new Map(exercises.map((e) => [e.id, e.title]));

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
  };
}
