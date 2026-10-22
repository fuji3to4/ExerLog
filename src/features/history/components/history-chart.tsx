"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GraphSeries } from "../history-graph-query";

type HistoryChartProps = {
  series: GraphSeries;
};

function formatTimestampToMD(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** "M/D HH:mm" read from the ISO string's own digits (the time as recorded, no timezone conversion). */
export function formatPointTime(at: string): string {
  const month = Number(at.slice(5, 7));
  const day = Number(at.slice(8, 10));
  return `${month}/${day} ${at.slice(11, 16)}`;
}

export function formatPointValue(value: number, series: GraphSeries): string {
  return value.toFixed(series.decimals);
}

const CustomTooltip = ({ active, payload, series }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload as { at: string; value: number };
    return (
      <div className="rounded-lg border bg-popover p-2 shadow-md">
        <p className="text-xs text-muted-foreground">{formatPointTime(point.at)}</p>
        <p className="text-sm font-bold text-foreground">
          {formatPointValue(point.value, series)}{" "}
          <span className="text-xs font-normal text-muted-foreground">{series.unit}</span>
        </p>
      </div>
    );
  }

  return null;
};

export function HistoryChart({ series }: HistoryChartProps) {
  const chartData = useMemo(() => {
    return series.points.map((point) => ({
      ...point,
      timestamp: Date.parse(point.at),
    }));
  }, [series.points]);

  return (
    <div
      className="relative min-h-[250px] min-w-[300px] rounded-xl border bg-popover p-4 shadow-sm"
      style={{ resize: "both", overflow: "hidden", height: "350px" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTimestampToMD}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            allowDecimals={series.decimals > 0}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            dx={-5}
          />
          <Tooltip
            content={<CustomTooltip series={series} />}
            cursor={{ stroke: "#2563eb", strokeWidth: 1 }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#historyGradient)"
            dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
