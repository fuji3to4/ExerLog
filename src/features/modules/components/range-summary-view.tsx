"use client";

import { useState, type ReactNode } from "react";

import { getDateRangeForPreset, RangePresetButtons, type DateRangePreset } from "@/features/history/range-presets";
import { periodDayCount, periodOfDayRange, type Period } from "../period";

/** Range buttons (7d/30d/90d/all, default 30d) and `children(period, dayCount)`; dayCount is null for "all". */
export function RangeSummaryView({ children }: { children(period: Period, dayCount: number | null): ReactNode }) {
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const period = periodOfDayRange(getDateRangeForPreset(preset));
  return (
    <div className="space-y-3">
      <RangePresetButtons value={preset} onChange={setPreset} />
      {children(period, preset === "all" ? null : periodDayCount(period))}
    </div>
  );
}
