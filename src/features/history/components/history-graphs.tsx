"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/features/i18n/use-translation";
import { buildHistoryGraphSeries, type GraphMetricSelection, type GraphSeries } from "@/features/history/history-graph-query";
import { toDayKey } from "@/lib/date/day-key";
import { HistoryChart } from "./history-chart";

type DateRangePreset = "7d" | "30d" | "90d" | "all";

type MetricOption = {
  value: GraphMetricSelection;
  label: string;
};

const METRIC_OPTIONS: MetricOption[] = [
  { value: { kind: "metric", metricType: "weight" }, label: "Weight" },
  { value: { kind: "metric", metricType: "bodyFat" }, label: "Body fat" },
  { value: { kind: "metric", metricType: "height" }, label: "Height" },
  { value: { kind: "wellness", score: "physical" }, label: "Physical wellness" },
  { value: { kind: "wellness", score: "mental" }, label: "Mental wellness" },
];

function getDateRangeForPreset(preset: DateRangePreset): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = toDayKey(today);

  if (preset === "all") {
    return { start: "1900-01-01", end: endDate };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  return { start: toDayKey(startDate), end: endDate };
}

export function HistoryGraphs() {
  const { t } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<GraphMetricSelection>(METRIC_OPTIONS[0]!.value);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("7d");
  const [series, setSeries] = useState<GraphSeries | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadGraphData() {
      setLoading(true);
      const range = getDateRangeForPreset(dateRangePreset);

      try {
        const graphSeries = await buildHistoryGraphSeries({
          range,
          metric: selectedMetric,
        });

        if (isActive) {
          setSeries(graphSeries);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadGraphData();

    return () => {
      isActive = false;
    };
  }, [selectedMetric, dateRangePreset]);

  const hasData = series && series.points.length > 0;

  return (
    <section className="card">
      <h2>{t("history_graphs_heading")}</h2>

      <div className="history-screen__chart-container" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <label htmlFor="metric-selector" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: "600" }}>{t("history_graph_metric_label")}</span>
            <select
              id="metric-selector"
              value={JSON.stringify(selectedMetric)}
              onChange={(e) => setSelectedMetric(JSON.parse(e.currentTarget.value))}
            >
              {METRIC_OPTIONS.map((option, index) => (
                <option key={index} value={JSON.stringify(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="history-screen__date-presets">
            {(["7d", "30d", "90d", "all"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDateRangePreset(preset)}
                className={`history-screen__preset-btn ${dateRangePreset === preset ? "is-active" : ""}`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="history-screen__chart-loading">Loading...</p>}

      {!loading && hasData && series && (
        <div className="history-screen__chart-wrapper">
          <HistoryChart series={series} />
        </div>
      )}

      {!loading && !hasData && <p className="history-screen__chart-empty">{t("history_graphs_empty")}</p>}
    </section>
  );
}
