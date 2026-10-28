"use client";

import type { CSSProperties } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { getRecordModule } from "@/features/modules/registry";
import { formatDuration } from "@/lib/date/duration";
import { timeOfIso } from "@/lib/date/local-iso";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "../build-timeline";

export type DayTimelineProps = {
  items: TimelineItem[];
  highlightId: string | null;
  onSelect(item: TimelineItem): void;
};

const WATCH_COLOR = "#4a7bd0";
const EXERCISE_COLOR = "#3aa76d";

function pointColor(item: TimelineItem): string | undefined {
  switch (item.kind) {
    case "module":
      return getRecordModule(item.moduleId)?.color;
    case "watch":
      return WATCH_COLOR;
    case "exercise":
      return EXERCISE_COLOR;
  }
}

function itemKey(item: TimelineItem): string {
  return item.kind === "module" ? `module:${item.moduleId}:${item.id}` : `${item.kind}:${item.id}`;
}

export function DayTimeline({ items, highlightId, onSelect }: DayTimelineProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("timeline_empty")}</p>;
  }

  return (
    <ol className="day-timeline">
      {items.map((item) => (
        <li key={itemKey(item)} className="day-timeline__row">
          <time className="day-timeline__time" dateTime={item.at}>
            {timeOfIso(item.at)}
          </time>
          <button
            type="button"
            className={cn("timeline-item", item.id === highlightId && "timeline-item--new")}
            style={{ "--c": pointColor(item) } as CSSProperties}
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
    case "module": {
      const TimelineCard = getRecordModule(item.moduleId)?.TimelineCard;
      return TimelineCard ? <TimelineCard record={item.record} label={item.label} /> : null;
    }
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
