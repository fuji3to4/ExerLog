"use client";

import { useEffect, useState } from "react";
import { buildHistoryGraphSeries } from "@/features/history/history-graph-query";
import { HistoryChart } from "@/features/history/components/history-chart";
import { DashboardCard } from "./dashboard-card";

type DateRangePreset = "7d" | "30d" | "90d" | "all";

export function GraphStatsCard() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("7d");
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadGraphData() {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = today.toISOString().split("T")[0]!;

      const days = dateRangePreset === "7d" ? 7 : dateRangePreset === "30d" ? 30 : dateRangePreset === "90d" ? 90 : 365;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);
      const start = startDate.toISOString().split("T")[0]!;

      try {
        const graphSeries = await buildHistoryGraphSeries({
          range: { start, end: endDate },
          metric: { kind: "metric", metricType: "weight" },
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
  }, [dateRangePreset]);

  return (
    <DashboardCard title="Graph Statistics">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "all"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRangePreset(preset)}
              className={`rounded-md px-3 py-1 text-sm ${
                dateRangePreset === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && series && series.points.length > 0 && (
          <div className="overflow-x-auto">
            <HistoryChart series={series} />
          </div>
        )}

        {!loading && (!series || series.points.length === 0) && (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </div>
    </DashboardCard>
  );
}
