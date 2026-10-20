import { calculateBmi } from "@/features/metrics/bmi";
import { findLatestHeightOnOrBefore, listMetricEntriesInRange } from "@/features/storage/daily-metrics.repository";
import { appDb } from "@/features/storage/app-db";
import { listWellnessEntriesInRange } from "@/features/storage/wellness-entries.repository";
import type { DailySelfCareEntry, MetricType, WellnessEntry } from "@/lib/types";

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
  | { kind: "bmi" }
  | { kind: "wellness"; score: "physical" | "mental" }
  | { kind: "selfCare"; selfCareId: string; measure: "count" | "minutes" | "done" };

export type GraphSeries = {
  unit: string;
  points: GraphPoint[];
};

type BuildHistoryGraphSeriesInput = {
  range: GraphRange;
  metric: GraphMetricSelection;
};

const METRIC_UNITS: Record<MetricType, string> = {
  height: "cm",
  weight: "kg",
  bodyFat: "%",
};

function sortPoints(points: GraphPoint[]) {
  return points.sort((left, right) => left.date.localeCompare(right.date));
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

/** One point per weight entry; each uses the latest height recorded on or before that day. */
async function buildBmiPoints({ start, end }: GraphRange): Promise<GraphPoint[]> {
  const weights = await listMetricEntriesInRange("weight", start, end);
  const heightByDate = new Map<string, Promise<number | null>>();
  const points: GraphPoint[] = [];

  for (const weight of weights) {
    let height = heightByDate.get(weight.date);
    if (!height) {
      height = findLatestHeightOnOrBefore(weight.date);
      heightByDate.set(weight.date, height);
    }
    const heightCm = await height;
    const bmi = heightCm === null ? null : calculateBmi(weight.value, heightCm);
    if (bmi !== null) points.push({ date: weight.date, value: bmi });
  }

  return points;
}

/** Per-day average of the chosen score, rounded to one decimal. */
function averageWellnessByDay(entries: WellnessEntry[], score: "physical" | "mental"): GraphPoint[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const entry of entries) {
    const value = score === "physical" ? entry.physicalScore : entry.mentalScore;
    const total = totals.get(entry.date) ?? { sum: 0, count: 0 };
    totals.set(entry.date, { sum: total.sum + value, count: total.count + 1 });
  }

  return sortPoints(
    [...totals].map(([date, { sum, count }]) => ({ date, value: Math.round((sum / count) * 10) / 10 })),
  );
}

export async function buildHistoryGraphSeries({
  range,
  metric,
}: BuildHistoryGraphSeriesInput): Promise<GraphSeries> {
  if (metric.kind === "metric") {
    const entries = await listMetricEntriesInRange(metric.metricType, range.start, range.end);

    return {
      unit: entries[0]?.unit ?? METRIC_UNITS[metric.metricType],
      points: entries.map((entry) => ({ date: entry.date, value: entry.value })),
    };
  }

  if (metric.kind === "bmi") {
    return { unit: "", points: await buildBmiPoints(range) };
  }

  if (metric.kind === "wellness") {
    const entries = await listWellnessEntriesInRange(range.start, range.end);

    return {
      unit: "/5",
      points: averageWellnessByDay(entries, metric.score),
    };
  }

  const entries = await appDb.dailySelfCareLogs
    .where("date")
    .between(range.start, range.end, true, true)
    .filter((entry) => entry.selfCareId === metric.selfCareId)
    .toArray();

  return {
    unit: "",
    points: sortPoints(
      entries.map((entry) => ({
        date: entry.date,
        value: mapSelfCareValue(entry, metric.measure),
      })),
    ),
  };
}
