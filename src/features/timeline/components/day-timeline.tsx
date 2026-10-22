"use client";

import type { CSSProperties } from "react";

import { formatMeasurementSummary } from "@/features/measurements/measurement-items";
import { useTranslation } from "@/features/i18n/use-translation";
import { formatDuration } from "@/lib/date/duration";
import { timeOfIso } from "@/lib/date/local-iso";
import { cn } from "@/lib/utils";
import type { TimelineItem, WellnessLabel } from "../build-timeline";

export type DayTimelineProps = {
  items: TimelineItem[];
  highlightId: string | null;
  onSelect(item: TimelineItem): void;
};

const POINT_COLORS: Record<TimelineItem["kind"], string> = {
  wellness: "#e48a3a",
  measurement: "#7a4fb0",
  watch: "#4a7bd0",
  exercise: "#3aa76d",
};

const LABEL_KEYS = {
  morning: "timeline_label_morning",
  beforeVideo: "timeline_label_before_video",
  afterVideo: "timeline_label_after_video",
  night: "timeline_label_night",
} as const satisfies Record<WellnessLabel, string>;

export function DayTimeline({ items, highlightId, onSelect }: DayTimelineProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("timeline_empty")}</p>;
  }

  return (
    <ol className="day-timeline">
      {items.map((item) => (
        <li key={`${item.kind}:${item.id}`} className="day-timeline__row">
          <time className="day-timeline__time" dateTime={item.at}>
            {timeOfIso(item.at)}
          </time>
          <button
            type="button"
            className={cn("timeline-item", item.id === highlightId && "timeline-item--new")}
            style={{ "--c": POINT_COLORS[item.kind] } as CSSProperties}
            onClick={() => onSelect(item)}
          >
            <ItemBody item={item} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function ItemBody({ item }: { item: TimelineItem }) {
  const { t } = useTranslation();

  switch (item.kind) {
    case "wellness":
      return (
        <>
          <span className="block">
            {t("timeline_wellness_row", {
              physical: item.entry.physicalScore,
              mental: item.entry.mentalScore,
            })}
            {item.label ? <span className="timeline-tag">{t(LABEL_KEYS[item.label])}</span> : null}
          </span>
          {item.entry.note ? <span className="block text-muted-foreground">{item.entry.note}</span> : null}
        </>
      );
    case "measurement":
      return (
        <span className="block">
          {t("timeline_measurement_row", { summary: formatMeasurementSummary(item.record, t) })}
          {item.label ? <span className="timeline-tag">{t(LABEL_KEYS[item.label])}</span> : null}
        </span>
      );
    case "watch":
      return <span className="block">{t("timeline_watched", { title: item.title })}</span>;
    case "exercise":
      return (
        <>
          <span className="block">
            {t("timeline_exercise_row", {
              title: item.title,
              result: t(item.log.result === "did" ? "result_did" : "result_partial"),
            })}
          </span>
          <span className="block tabular-nums text-muted-foreground">
            {formatDuration(item.log.durationSeconds)}
          </span>
        </>
      );
  }
}
