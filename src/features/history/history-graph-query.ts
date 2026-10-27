import {
  buildCircumferencePoints,
  type CircumferencePoint,
  type CircumferenceSite,
  type Limb,
} from "@/features/measurements/circumference";
import { getMeasurementItem } from "@/features/measurements/measurement-items";
import { calculateBmi } from "@/features/metrics/bmi";
import { appDb } from "@/features/storage/app-db";
import { bodyRepository } from "@/features/modules/body/data";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { listWellnessEntriesInRange } from "@/features/modules/wellness/data";
import type { DailySelfCareEntry } from "@/lib/types";

type GraphRange = {
  start: string;
  end: string;
};

/** `at` is an ISO timestamp with offset. */
export type GraphPoint = {
  at: string;
  value: number;
};

export type GraphMetricSelection =
  | { kind: "measurement"; itemId: string }
  | { kind: "bmi" }
  | { kind: "wellness"; score: "physical" | "mental" }
  | { kind: "selfCare"; selfCareId: string; measure: "count" | "minutes" | "done" }
  /** Drawn by CircumferenceGraph from buildCircumferenceSeries; this series is always empty. */
  | { kind: "circumference" };

export type GraphSeries = {
  unit: string;
  decimals: number;
  points: GraphPoint[];
};

type BuildHistoryGraphSeriesInput = {
  range: GraphRange;
  metric: GraphMetricSelection;
};

/** Oldest instant first; compares parsed instants so differing offsets order correctly. */
function sortByTime<T extends { at: string }>(items: T[]): T[] {
  return items.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
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

async function buildMeasurementSeries({ start, end }: GraphRange, itemId: string): Promise<GraphSeries> {
  const item = getMeasurementItem(itemId);
  const records = await bodyRepository.listInDayRange(start, end);
  const points = records
    .filter((record) => itemId in record.values)
    .map((record) => ({ at: record.recordedAt, value: record.values[itemId]! }));

  return { unit: item?.unit ?? "", decimals: item?.decimals ?? 1, points: sortByTime(points) };
}

/**
 * One point per weight record in the range, using the newest height recorded at or
 * before it. Records up to the range end are read once and heights walked in time order.
 */
async function buildBmiPoints({ start, end }: GraphRange): Promise<GraphPoint[]> {
  const upToEnd = await bodyRepository.listInDayRange("0000-01-01", end);
  const heights = sortByTime(
    upToEnd
      .filter((record) => "height" in record.values)
      .map((record) => ({ at: record.recordedAt, value: record.values.height! })),
  );
  const weights = sortByTime(
    upToEnd
      .filter((record) => record.date >= start && "weight" in record.values)
      .map((record) => ({ at: record.recordedAt, value: record.values.weight! })),
  );

  const points: GraphPoint[] = [];
  let heightIndex = 0;
  let heightCm: number | null = null;
  for (const weight of weights) {
    const weightTime = Date.parse(weight.at);
    while (heightIndex < heights.length && Date.parse(heights[heightIndex]!.at) <= weightTime) {
      heightCm = heights[heightIndex]!.value;
      heightIndex++;
    }
    const bmi = heightCm === null ? null : calculateBmi(weight.value, heightCm);
    if (bmi !== null) points.push({ at: weight.at, value: bmi });
  }

  return points;
}

export async function buildHistoryGraphSeries({
  range,
  metric,
}: BuildHistoryGraphSeriesInput): Promise<GraphSeries> {
  if (metric.kind === "measurement") {
    return buildMeasurementSeries(range, metric.itemId);
  }

  if (metric.kind === "bmi") {
    return { unit: "", decimals: 1, points: await buildBmiPoints(range) };
  }

  if (metric.kind === "circumference") {
    return { unit: "cm", decimals: 1, points: [] };
  }

  if (metric.kind === "wellness") {
    const entries = await listWellnessEntriesInRange(range.start, range.end);

    return {
      unit: "/5",
      decimals: 0,
      points: sortByTime(
        entries.map((entry) => ({
          at: entry.recordedAt,
          value: metric.score === "physical" ? entry.physicalScore : entry.mentalScore,
        })),
      ),
    };
  }

  const entries = await appDb.dailySelfCareLogs
    .where("date")
    .between(range.start, range.end, true, true)
    .filter((entry) => entry.selfCareId === metric.selfCareId)
    .toArray();

  return {
    unit: "",
    decimals: 0,
    points: sortByTime(
      entries.map((entry) => ({
        at: `${entry.date}T00:00:00`,
        value: mapSelfCareValue(entry, metric.measure),
      })),
    ),
  };
}

/** Reads records up to the range end so earlier ones can serve as "previous" values. */
export async function buildCircumferenceSeries(input: {
  range: GraphRange;
  limb: Limb;
  site: CircumferenceSite;
}): Promise<CircumferencePoint[]> {
  const upToEnd = await circumferenceRepository.listInDayRange("0000-01-01", input.range.end);
  return buildCircumferencePoints(upToEnd, input.limb, input.site, input.range.start);
}
