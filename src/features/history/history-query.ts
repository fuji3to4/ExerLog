import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { getDailyCondition } from "@/features/storage/daily-condition.repository";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";

type HistoryDayLog = {
  exerciseId: string;
  title: string;
  result: "did" | "partial" | "could_not";
};

export type HistoryDaySummary = {
  logs: HistoryDayLog[];
  conditionLevel: "good" | "okay" | "tired" | null;
  note: string;
};

export async function listCompletedDaysInMonth(month: string) {
  const monthLogs = await appDb.logs.where("date").startsWith(month).toArray();

  return [...new Set(monthLogs.map((entry) => entry.date))].sort();
}

export async function getHistoryDaySummary(date: string): Promise<HistoryDaySummary> {
  const [logs, condition] = await Promise.all([listExerciseLogsForDay(date), getDailyCondition(date)]);

  return {
    logs: logs.map((log) => ({
      exerciseId: log.exerciseId,
      title: exerciseCatalog.find((exercise) => exercise.id === log.exerciseId)?.title ?? log.exerciseId,
      result: log.result,
    })),
    conditionLevel: condition?.conditionLevel ?? null,
    note: condition?.note ?? "",
  };
}
