import type { DailyMetricEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

export type MetricDraft = Pick<DailyMetricEntry, "metricType" | "value" | "unit">;

export function listDailyMetricsByDate(date: string) {
  return appDb.dailyMetrics.where("date").equals(date).sortBy("metricType");
}

export async function upsertDailyMetric(date: string, metric: MetricDraft) {
  return appDb.transaction("rw", appDb.dailyMetrics, async () => {
    const existing = await appDb.dailyMetrics
      .where("[date+metricType]")
      .equals([date, metric.metricType])
      .first();

    const result = await appDb.dailyMetrics.put({
      id: existing?.id ?? crypto.randomUUID(),
      date,
      ...metric,
      recordedAt: localIsoNow(),
    });
    scheduleSync();
    return result;
  });
}

export function deleteDailyMetric(
  date: string,
  metricType: DailyMetricEntry["metricType"],
) {
  return appDb.dailyMetrics.where("[date+metricType]").equals([date, metricType]).delete();
}

export async function replaceDailyMetrics(date: string, metrics: MetricDraft[]) {
  return appDb.transaction("rw", appDb.dailyMetrics, async () => {
    await appDb.dailyMetrics.where("date").equals(date).delete();

    if (metrics.length === 0) {
      return;
    }

    const metricTypes = new Set<string>();

    for (const metric of metrics) {
      if (metricTypes.has(metric.metricType)) {
        throw new Error("Duplicate metricType values in metrics array");
      }

      metricTypes.add(metric.metricType);
    }

    const recordedAt = localIsoNow();

    await appDb.dailyMetrics.bulkAdd(
      metrics.map((metric) => ({
        id: crypto.randomUUID(),
        date,
        ...metric,
        recordedAt,
      })),
    );
    scheduleSync();
  });
}
