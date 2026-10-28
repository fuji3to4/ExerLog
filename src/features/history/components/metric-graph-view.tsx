"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Messages } from "@/features/i18n/messages";

import { getDateRangeForPreset, RangePresetButtons, type DateRangePreset, type DayRange } from "../range-presets";
import { HistoryChart } from "./history-chart";

/** `at` is an ISO timestamp with offset. */
export type GraphPoint = { at: string; value: number };

export type GraphSeries = {
  unit: string;
  decimals: number;
  points: GraphPoint[];
  /** How the points are drawn; defaults to "area". */
  chart?: "area" | "bar";
};

/** One selectable item of a module's graph. */
export type GraphMetric = {
  key: string;
  labelKey: keyof Messages;
  load(range: DayRange): Promise<GraphSeries>;
};

/** Oldest instant first; compares parsed instants so differing offsets order correctly. */
export function sortByTime<T extends { at: string }>(items: T[]): T[] {
  return items.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
}

/** Item selector, range buttons and the chart for a module's metrics. */
export function MetricGraphView({ metrics }: { metrics: readonly GraphMetric[] }) {
  const { t } = useTranslation();
  const selectorId = useId();
  const [selectedKey, setSelectedKey] = useState(() => metrics[0]?.key ?? "");
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [series, setSeries] = useState<GraphSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const range = useMemo(() => getDateRangeForPreset(preset), [preset]);
  const metric = metrics.find((m) => m.key === selectedKey) ?? metrics[0];

  useEffect(() => {
    if (!metric) return;
    let isActive = true;
    setLoading(true);
    metric
      .load(range)
      .then((loaded) => {
        if (isActive) setSeries(loaded);
      })
      .catch((err) => {
        console.error("[history] graph series failed", err);
        if (isActive) setSeries(null);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [metric, range]);

  const hasData = series !== null && series.points.length > 0;

  return (
    <div>
      <div className="history-screen__chart-container" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <label htmlFor={selectorId} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: "600" }}>{t("history_graph_metric_label")}</span>
            <select id={selectorId} className="metric-selector" value={metric?.key ?? ""} onChange={(e) => setSelectedKey(e.currentTarget.value)}>
              {metrics.map((option) => (
                <option key={option.key} value={option.key}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <RangePresetButtons value={preset} onChange={setPreset} />
        </div>
      </div>

      {loading && <p className="history-screen__chart-loading">{t("common_loading")}</p>}

      {!loading && hasData && (
        <div className="history-screen__chart-wrapper">
          <HistoryChart series={series} />
        </div>
      )}

      {!loading && !hasData && <p className="history-screen__chart-empty">{t("history_graphs_empty")}</p>}
    </div>
  );
}
