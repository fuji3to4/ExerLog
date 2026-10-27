"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

export type DateRangePreset = "7d" | "30d" | "90d" | "all";

/** Inclusive day keys (`YYYY-MM-DD`). */
export type DayRange = { start: string; end: string };

const PRESETS: readonly DateRangePreset[] = ["7d", "30d", "90d", "all"];

export function getDateRangeForPreset(preset: DateRangePreset, today: Date = new Date()): DayRange {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const endKey = toDayKey(end);

  if (preset === "all") {
    return { start: "1900-01-01", end: endKey };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { start: toDayKey(start), end: endKey };
}

export function RangePresetButtons({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange(preset: DateRangePreset): void;
}) {
  const { t } = useTranslation();

  return (
    <div className="history-screen__date-presets">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          className={`history-screen__preset-btn ${value === preset ? "is-active" : ""}`}
        >
          {t(`history_range_${preset}` as const)}
        </button>
      ))}
    </div>
  );
}
