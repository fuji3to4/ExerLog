import { sortByTime, type GraphMetric } from "@/features/history/components/metric-graph-view";

import { listWellnessEntriesInRange } from "./data";

function scoreMetric(key: "physical" | "mental"): GraphMetric {
  return {
    key,
    labelKey: key === "physical" ? "history_graph_metric_physical" : "history_graph_metric_mental",
    async load(range) {
      const entries = await listWellnessEntriesInRange(range.start, range.end);
      return {
        unit: "/5",
        decimals: 0,
        points: sortByTime(
          entries.map((entry) => ({
            at: entry.recordedAt,
            value: key === "physical" ? entry.physicalScore : entry.mentalScore,
          })),
        ),
      };
    },
  };
}

/** Every wellness entry is its own point. */
export const WELLNESS_GRAPH_METRICS: readonly GraphMetric[] = [scoreMetric("physical"), scoreMetric("mental")];
