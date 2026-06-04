"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GraphSeries } from "./history-graph-query";

type CustomTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-lg">
        <p className="font-medium">{new Date(+payload[0].name).toLocaleDateString('ja-JP')}</p>
        <p className="text-blue-500">{`価格: ¥${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('ja-JP');
};

type HistoryChartProps = {
  data: GraphSeries[];
};

export const HistoryChart = ({ data }: HistoryChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tickFormatter={ts => formatDate(+ts)}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={value => `¥${value}`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="value" stroke="#8884d8" fill="url(#gradient)" />
        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Legend verticalAlign="top" height={36} />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  );
};
