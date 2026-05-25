import { listAllSelfCareItems } from "@/features/storage/self-care-catalog.repository";
import { appDb } from "@/features/storage/app-db";
import type { DailyMetricEntry, DailySelfCareEntry, MetricType } from "@/lib/types";

type GraphRange = {
  start: string;
  end: string;
};

type GraphPoint = {
  date: string;
  value: number;
};

export type GraphMetricSelection =
  | { kind: "metric"; metricType: MetricType }
  | { kind: "wellness"; score: "physical" | "mental" }
  | { kind: "selfCare"; selfCareId: string; measure: "count" | "minutes" | "done" };

export type GraphSeries = {
  label: string;
  unit: string;
  points: GraphPoint[];
};

type BuildHistoryGraphSeriesInput = {
  range: GraphRange;
  metric: GraphMetricSelection;
};

const METRIC_LABELS: Record<MetricType, string> = {
  height: "Height",
  weight: "Weight",
  bodyFat: "Body fat",
};

const METRIC_UNITS: Record<MetricType, string> = {
  height: "cm",
  weight: "kg",
  bodyFat: "%",
};

const SELF_CARE_UNITS: Record<Extract<GraphMetricSelection, { kind: "selfCare" }>["measure"], string> = {
  count: "count",
  minutes: "minutes",
  done: "done",
};

function sortPoints(points: GraphPoint[]) {
  return points.sort((left, right) => left.date.localeCompare(right.date));
}

function mapMetricPoints(entries: DailyMetricEntry[]) {
  return sortPoints(entries.map((entry) => ({ date: entry.date, value: entry.value })));
}

function mapSelfCareValue(entry: DailySelfCareEntry, measure: Extract<GraphMetricSelection, { kind: "selfCare" }>["measure"]) {
  if (measure === "count") {
    return entry.count ?? 0;
  }

  if (measure === "minutes") {
    return entry.minutes ?? 0;
  }

  return entry.isDone ? 1 : 0;
}

export async function buildHistoryGraphSeries({
  range,
  metric,
}: BuildHistoryGraphSeriesInput): Promise<GraphSeries> {
  if (metric.kind === "metric") {
    const entries = await appDb.dailyMetrics
      .where("date")
      .between(range.start, range.end, true, true)
      .filter((entry) => entry.metricType === metric.metricType)
      .toArray();

    return {
      label: METRIC_LABELS[metric.metricType],
      unit: entries[0]?.unit ?? METRIC_UNITS[metric.metricType],
      points: mapMetricPoints(entries),
    };
  }

  if (metric.kind === "wellness") {
    const entries = await appDb.dailyWellness.where("date").between(range.start, range.end, true, true).toArray();

    return {
      label: metric.score === "physical" ? "Physical wellness" : "Mental wellness",
      unit: "/5",
      points: sortPoints(
        entries.map((entry) => ({
          date: entry.date,
          value: metric.score === "physical" ? entry.physicalScore : entry.mentalScore,
        })),
      ),
    };
  }

  const [entries, selfCareItems] = await Promise.all([
    appDb.dailySelfCareLogs
      .where("date")
      .between(range.start, range.end, true, true)
      .filter((entry) => entry.selfCareId === metric.selfCareId)
      .toArray(),
    listAllSelfCareItems(),
  ]);
  const item = selfCareItems.find((selfCareItem) => selfCareItem.id === metric.selfCareId);

  return {
    label: item?.title ?? metric.selfCareId,
    unit: SELF_CARE_UNITS[metric.measure],
    points: sortPoints(
      entries.map((entry) => ({
        date: entry.date,
        value: mapSelfCareValue(entry, metric.measure),
      })),
    ),
  };
}
