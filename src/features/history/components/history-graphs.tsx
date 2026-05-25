"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/features/i18n/use-translation";
import { buildHistoryGraphSeries, type GraphMetricSelection, type GraphSeries } from "@/features/history/history-graph-query";
import { toDayKey } from "@/lib/date/day-key";

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
  today.setUTCHours(0, 0, 0, 0);
  const endDate = toDayKey(today);

  if (preset === "all") {
    return { start: "1900-01-01", end: endDate };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  return { start: toDayKey(startDate), end: endDate };
}

function calculateChartDimensions(pointCount: number) {
  const width = Math.max(400, pointCount * 30);
  const height = 300;
  const padding = 40;

  return {
    width,
    height,
    padding,
    chartWidth: width - padding * 2,
    chartHeight: height - padding * 2,
  };
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function renderPolyline(
  series: GraphSeries,
  dimensions: ReturnType<typeof calculateChartDimensions>,
): string {
  if (series.points.length === 0) return "";

  const values = series.points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const points = series.points.map((point, index) => {
    const x = dimensions.padding + (index / (series.points.length - 1 || 1)) * dimensions.chartWidth;
    const normalizedY = normalizeValue(point.value, min, max);
    const y = dimensions.padding + (1 - normalizedY) * dimensions.chartHeight;
    return `${x},${y}`;
  });

  return points.join(" ");
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
  const dimensions = calculateChartDimensions(series?.points.length ?? 0);

  return (
    <section className="card">
      <h2>{t("history_graphs_heading")}</h2>

      <div className="controls" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label htmlFor="metric-selector" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{t("history_graph_metric_label")}</span>
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

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["7d", "30d", "90d", "all"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRangePreset(preset)}
              style={{
                fontWeight: dateRangePreset === preset ? "bold" : "normal",
                backgroundColor: dateRangePreset === preset ? "#007bff" : "#f0f0f0",
                color: dateRangePreset === preset ? "white" : "black",
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && hasData && series && (
        <div style={{ overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            style={{ minWidth: "100%", border: "1px solid #ccc" }}
            role="img"
            aria-label="History graph"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = dimensions.padding + ratio * dimensions.chartHeight;
              return (
                <line
                  key={`grid-${ratio}`}
                  x1={dimensions.padding}
                  y1={y}
                  x2={dimensions.width - dimensions.padding}
                  y2={y}
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              );
            })}

            {/* Axes */}
            <line
              x1={dimensions.padding}
              y1={dimensions.padding}
              x2={dimensions.padding}
              y2={dimensions.height - dimensions.padding}
              stroke="#000"
              strokeWidth="2"
            />
            <line
              x1={dimensions.padding}
              y1={dimensions.height - dimensions.padding}
              x2={dimensions.width - dimensions.padding}
              y2={dimensions.height - dimensions.padding}
              stroke="#000"
              strokeWidth="2"
            />

            {/* Polyline chart */}
            <polyline
              points={renderPolyline(series, dimensions)}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
            />

            {/* Data points */}
            {series.points.map((point, index) => {
              const values = series.points.map((p) => p.value);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const normalizedY = normalizeValue(point.value, min, max);
              const x = dimensions.padding + (index / (series.points.length - 1 || 1)) * dimensions.chartWidth;
              const y = dimensions.padding + (1 - normalizedY) * dimensions.chartHeight;

              return (
                <circle key={`point-${index}`} cx={x} cy={y} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              );
            })}

            {/* Label */}
            <text x={dimensions.padding + 5} y={dimensions.padding - 10} fontSize="12" fill="#666">
              {series.label} ({series.unit})
            </text>
          </svg>
        </div>
      )}

      {!loading && !hasData && <p>{t("history_graphs_empty")}</p>}
    </section>
  );
}
