import type { DailyMetricEntry, MetricType } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "DailyMetrics";

export type MetricDraft = Pick<DailyMetricEntry, "metricType" | "value" | "unit">;

export function listDailyMetricsByDate(date: string) {
  return appDb.dailyMetrics.where("date").equals(date).sortBy("metricType");
}

export async function findLatestHeightOnOrBefore(date: string): Promise<number | null> {
  const heights = await appDb.dailyMetrics
    .where("date")
    .belowOrEqual(date)
    .filter((entry) => entry.metricType === "height")
    .toArray();

  let latest: DailyMetricEntry | undefined;
  for (const entry of heights) {
    if (
      !latest ||
      entry.date > latest.date ||
      (entry.date === latest.date && entry.recordedAt > latest.recordedAt)
    ) {
      latest = entry;
    }
  }

  return latest?.value ?? null;
}

export async function listMetricEntriesInRange(
  metricType: MetricType,
  start: string,
  end: string,
): Promise<DailyMetricEntry[]> {
  const entries = await appDb.dailyMetrics
    .where("date")
    .between(start, end, true, true)
    .filter((entry) => entry.metricType === metricType)
    .toArray();

  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt));
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

export async function deleteDailyMetric(
  date: string,
  metricType: DailyMetricEntry["metricType"],
): Promise<void> {
  await appDb.transaction("rw", appDb.dailyMetrics, appDb.tombstones, async () => {
    const collection = appDb.dailyMetrics.where("[date+metricType]").equals([date, metricType]);
    const ids = await collection.primaryKeys();
    await collection.delete();
    await recordTombstones(TOMBSTONE_TABLE, ids);
  });
  scheduleSync();
}

export async function replaceDailyMetrics(date: string, metrics: MetricDraft[]) {
  return appDb.transaction("rw", appDb.dailyMetrics, appDb.tombstones, async () => {
    const existing = appDb.dailyMetrics.where("date").equals(date);
    const removedIds = await existing.primaryKeys();
    await existing.delete();
    await recordTombstones(TOMBSTONE_TABLE, removedIds);

    if (metrics.length === 0) {
      scheduleSync();
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
