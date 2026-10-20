"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { buildHistoryGraphSeries, type GraphMetricSelection, type GraphSeries } from "@/features/history/history-graph-query";
import { toDayKey } from "@/lib/date/day-key";
import { HistoryChart } from "./history-chart";

type DateRangePreset = "7d" | "30d" | "90d" | "all";

type MetricOption = {
  value: GraphMetricSelection;
  labelKey:
    | "history_graph_metric_weight"
    | "history_graph_metric_body_fat"
    | "history_graph_metric_height"
    | "history_graph_metric_bmi"
    | "history_graph_metric_physical"
    | "history_graph_metric_mental";
};

const METRIC_OPTIONS: MetricOption[] = [
  { value: { kind: "metric", metricType: "weight" }, labelKey: "history_graph_metric_weight" },
  { value: { kind: "metric", metricType: "bodyFat" }, labelKey: "history_graph_metric_body_fat" },
  { value: { kind: "metric", metricType: "height" }, labelKey: "history_graph_metric_height" },
  { value: { kind: "bmi" }, labelKey: "history_graph_metric_bmi" },
  { value: { kind: "wellness", score: "physical" }, labelKey: "history_graph_metric_physical" },
  { value: { kind: "wellness", score: "mental" }, labelKey: "history_graph_metric_mental" },
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
    <Card>
      <CardHeader>
        <CardTitle>{t("history_graphs_heading")}</CardTitle>
      </CardHeader>

      <CardContent>
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
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <div className="history-screen__date-presets">
              {(["7d", "30d", "90d", "all"] as const).map((preset) => (
                <button
                  key={t(`history_range_${preset}` as const)}
                  onClick={() => setDateRangePreset(preset)}
                  className={`history-screen__preset-btn ${dateRangePreset === preset ? "is-active" : ""}`}
                >
                  {t(`history_range_${preset}` as const)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && <p className="history-screen__chart-loading">{t("common_loading")}</p>}

        {!loading && hasData && series && (
          <div className="history-screen__chart-wrapper">
            <HistoryChart series={series} />
          </div>
        )}

        {!loading && !hasData && <p className="history-screen__chart-empty">{t("history_graphs_empty")}</p>}
      </CardContent>
    </Card>
  );
}
