import type { GraphMetric, GraphPoint } from "@/features/history/components/metric-graph-view";
import { localIsoAt } from "@/lib/date/local-iso";
import type { CompressionKind } from "@/lib/types";

import { listCompressionInRange } from "./data";
import { dailyWearHours } from "./summary";

const NOON = new Date(2000, 0, 1, 12, 0, 0);

function nextDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function kindMetric(kind: CompressionKind): GraphMetric {
  return {
    key: kind,
    labelKey: kind === "garment" ? "compression_kind_garment" : "compression_kind_bandage",
    async load({ start, end }) {
      const days = dailyWearHours(await listCompressionInRange(start, end), kind);
      // The bar chart's X axis has one slot per point, so days without wear are filled with 0 h.
      const byDate = new Map(days.map((day) => [day.date, day.hours]));
      const points: GraphPoint[] = [];
      if (days.length > 0) {
        const last = days[days.length - 1].date;
        for (let date = days[0].date; date <= last; date = nextDay(date)) {
          points.push({ at: localIsoAt(date, NOON), value: byDate.get(date) ?? 0 });
        }
      }
      return { unit: "h", decimals: 1, points, chart: "bar" };
    },
  };
}

export const COMPRESSION_GRAPH_METRICS: readonly GraphMetric[] = [kindMetric("garment"), kindMetric("bandage")];
