"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Messages } from "@/features/i18n/messages";
import {
  CIRCUMFERENCE_SITES,
  LIMBS,
  SIDE_COLORS,
  formatDelta,
  readCircumferenceLimb,
  sideDifference,
  writeCircumferenceLimb,
  type CircumferencePoint,
  type CircumferenceSite,
  type Limb,
  type Side,
} from "@/features/measurements/circumference";
import { SegmentedTabs } from "@/features/timeline/components/segmented-tabs";
import { buildCircumferenceSeries } from "../history-graph-query";
import { formatPointTime } from "./history-chart";

type Translate = (key: keyof Messages, replacements?: Record<string, string | number>) => string;

/** Circumference items are recorded to 0.1 cm. */
const DECIMALS = 1;

const LIMB_LABEL_KEYS = { arm: "circumference_limb_arm", leg: "circumference_limb_leg" } as const;
const SIDE_LABEL_KEYS = { left: "circumference_side_left", right: "circumference_side_right" } as const;

type TooltipRow = { text: string; color?: string };

function tooltipRows(point: CircumferencePoint, t: Translate): TooltipRow[] {
  const rows: TooltipRow[] = [{ text: formatPointTime(point.at) }];

  for (const side of ["right", "left"] as const) {
    const reading = point[side];
    if (!reading) continue;
    const replacements = { side: t(SIDE_LABEL_KEYS[side]), value: reading.value.toFixed(DECIMALS) };
    rows.push({
      text:
        reading.delta === null
          ? t("circumference_tooltip_side_no_previous", replacements)
          : t("circumference_tooltip_side", { ...replacements, delta: formatDelta(reading.delta, DECIMALS) }),
      color: SIDE_COLORS[side],
    });
  }

  const difference = sideDifference(point, DECIMALS);
  if (difference) {
    rows.push({
      text:
        difference.larger === null
          ? t("circumference_tooltip_difference_equal")
          : t("circumference_tooltip_difference", {
              amount: difference.amount.toFixed(DECIMALS),
              side: t(SIDE_LABEL_KEYS[difference.larger]),
            }),
    });
  }

  return rows;
}

/** Tooltip text in order: time, right, left, then the left/right difference when both sides exist. */
export function circumferenceTooltipLines(point: CircumferencePoint, t: Translate): string[] {
  return tooltipRows(point, t).map((row) => row.text);
}

type ChartRow = { timestamp: number; leftValue?: number; rightValue?: number; point: CircumferencePoint };

function formatTimestampToMD(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function CircumferenceTooltip({ active, payload, t }: { active?: boolean; payload?: { payload: ChartRow }[]; t: Translate }) {
  if (!active || !payload || payload.length === 0) return null;
  const [time, ...rows] = tooltipRows(payload[0]!.payload.point, t);

  return (
    <div className="rounded-lg border bg-popover p-2 shadow-md">
      <p className="text-xs text-muted-foreground">{time!.text}</p>
      {rows.map((row) => (
        <p key={row.text} className="text-sm font-medium text-foreground" style={row.color ? { color: row.color } : undefined}>
          {row.text}
        </p>
      ))}
    </div>
  );
}

/** Square marker for the right side so the two lines differ by shape, not only color. */
function SquareDot({ cx, cy, fill, size }: { cx?: number; cy?: number; fill: string; size: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={fill} />;
}

export function CircumferenceGraph({ range }: { range: { start: string; end: string } }) {
  const { t } = useTranslation();
  const [limb, setLimb] = useState<Limb>(() => readCircumferenceLimb());
  const [site, setSite] = useState<CircumferenceSite>(() => CIRCUMFERENCE_SITES[readCircumferenceLimb()][0]!);
  const [points, setPoints] = useState<CircumferencePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    buildCircumferenceSeries({ range: { start: range.start, end: range.end }, limb, site })
      .then((series) => {
        if (isActive) setPoints(series);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [range.start, range.end, limb, site]);

  function changeLimb(next: Limb) {
    setLimb(next);
    setSite(CIRCUMFERENCE_SITES[next][0]!);
    writeCircumferenceLimb(next);
  }

  const chartData = useMemo(
    (): ChartRow[] =>
      points.map((point) => ({
        timestamp: Date.parse(point.at),
        leftValue: point.left?.value,
        rightValue: point.right?.value,
        point,
      })),
    [points],
  );

  const sideLabel = (side: Side) => t(SIDE_LABEL_KEYS[side]);

  return (
    <SegmentedTabs
      options={LIMBS}
      value={limb}
      onChange={changeLimb}
      label={t("circumference_limb_label")}
      renderTab={(option) => t(LIMB_LABEL_KEYS[option])}
    >
      <div className="space-y-4">
        <div className="history-screen__date-presets">
          {CIRCUMFERENCE_SITES[limb].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === site}
              onClick={() => setSite(option)}
              className={`history-screen__preset-btn ${option === site ? "is-active" : ""}`}
            >
              {t(`circumference_site_${option}`)}
            </button>
          ))}
        </div>

        {loading && <p className="history-screen__chart-loading">{t("common_loading")}</p>}

        {!loading && points.length === 0 && <p className="history-screen__chart-empty">{t("history_graphs_empty")}</p>}

        {!loading && points.length > 0 && (
          <div className="history-screen__chart-wrapper">
            <div
              className="relative min-h-[250px] min-w-[300px] rounded-xl border bg-popover p-4 shadow-sm"
              style={{ resize: "both", overflow: "hidden", height: "350px" }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CircumferenceTooltip t={t} />} cursor={{ stroke: "#9ca3af", strokeWidth: 1 }} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="rightValue"
                    name={sideLabel("right")}
                    legendType="square"
                    stroke={SIDE_COLORS.right}
                    strokeWidth={2.5}
                    connectNulls
                    dot={(props: { key?: string; cx?: number; cy?: number }) => (
                      <SquareDot key={props.key} cx={props.cx} cy={props.cy} fill={SIDE_COLORS.right} size={6} />
                    )}
                    activeDot={(props: { cx?: number; cy?: number }) => (
                      <SquareDot cx={props.cx} cy={props.cy} fill={SIDE_COLORS.right} size={10} />
                    )}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="leftValue"
                    name={sideLabel("left")}
                    legendType="circle"
                    stroke={SIDE_COLORS.left}
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3, fill: SIDE_COLORS.left, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: SIDE_COLORS.left, strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </SegmentedTabs>
  );
}
