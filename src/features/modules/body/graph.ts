import {
  sortByTime,
  type GraphMetric,
  type GraphPoint,
} from "@/features/history/components/metric-graph-view";
import type { DayRange } from "@/features/history/range-presets";
import { BODY_ITEMS, type MeasurementItem } from "@/features/measurements/measurement-items";
import type { MeasurementRepository } from "@/features/measurements/measurement-repository";
import { calculateBmi } from "@/features/metrics/bmi";

import { bodyRepository } from "./data";

export function itemMetric(repository: MeasurementRepository, item: MeasurementItem): GraphMetric {
  return {
    key: item.id,
    labelKey: item.labelKey,
    async load({ start, end }) {
      const records = await repository.listInDayRange(start, end);
      const points = records
        .filter((record) => item.id in record.values)
        .map((record) => ({ at: record.recordedAt, value: record.values[item.id]! }));
      return { unit: item.unit, decimals: item.decimals, points: sortByTime(points) };
    },
  };
}

/**
 * One point per weight record in the range, using the newest height recorded at or
 * before it. Records up to the range end are read once and heights walked in time order.
 */
async function buildBmiPoints({ start, end }: DayRange): Promise<GraphPoint[]> {
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

/** Graphable body items in list order, then BMI. */
export const BODY_GRAPH_METRICS: readonly GraphMetric[] = [
  ...BODY_ITEMS.filter((item) => item.showInGraph).map((item) => itemMetric(bodyRepository, item)),
  {
    key: "bmi",
    labelKey: "history_graph_metric_bmi",
    async load(range) {
      return { unit: "", decimals: 1, points: await buildBmiPoints(range) };
    },
  },
];
