import type { DailyMetricEntry } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "./app-db";

export type MetricDraft = Pick<DailyMetricEntry, "metricType" | "value" | "unit">;

export function listDailyMetricsByDate(date: string) {
  return appDb.dailyMetrics.where("date").equals(date).sortBy("metricType");
}

export async function replaceDailyMetrics(date: string, metrics: MetricDraft[]) {
  return appDb.transaction("rw", appDb.dailyMetrics, async () => {
    await appDb.dailyMetrics.where("date").equals(date).delete();

    if (metrics.length === 0) {
      return;
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
  });
}
