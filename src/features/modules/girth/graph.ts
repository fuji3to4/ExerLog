import type { GraphMetric } from "@/features/history/components/metric-graph-view";
import { GIRTH_ITEMS } from "@/features/measurements/measurement-items";
import { itemMetric } from "../body/graph";
import { girthRepository } from "./data";

/** Graphable girth items in list order. */
export const GIRTH_GRAPH_METRICS: readonly GraphMetric[] = GIRTH_ITEMS.filter((item) => item.showInGraph).map(
  (item) => itemMetric(girthRepository, item),
);
