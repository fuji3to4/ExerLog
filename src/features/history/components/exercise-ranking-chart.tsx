"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const LABEL_CHARS = 8;
const ROW_HEIGHT = 32;

function shorten(title: string): string {
  return title.length > LABEL_CHARS ? `${title.slice(0, LABEL_CHARS)}…` : title;
}

const RankingTooltip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as { title: string; value: number };
  return (
    <div className="rounded-lg border bg-popover p-2 shadow-md">
      <p className="text-xs text-muted-foreground">{item.title}</p>
      <p className="text-sm font-bold text-foreground">
        {Math.round(item.value)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
};

/** Horizontal bars, one per exercise, in the given order (most first). */
export function ExerciseRankingChart({ items, unit }: { items: { title: string; value: number }[]; unit: string }) {
  return (
    <div className="rounded-xl border bg-popover p-4 shadow-sm" style={{ height: 40 + items.length * ROW_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="title"
            width={120}
            tickFormatter={shorten}
            tick={{ fontSize: 12, fill: "#374151" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<RankingTooltip unit={unit} />} cursor={{ fill: "#2563eb", fillOpacity: 0.08 }} />
          <Bar isAnimationActive={false} dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
