"use client";

import { useState, type CSSProperties } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { getRecordModule } from "@/features/modules/registry";
import { formatDuration } from "@/lib/date/duration";
import { timeOfIso } from "@/lib/date/local-iso";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "../build-timeline";
import { DayRuler } from "./day-ruler";

export type DayTimelineProps = {
  items: TimelineItem[];
  highlightId: string | null;
  onSelect(item: TimelineItem): void;
  /** Wall-clock hours for the ruler's "now" line; only today passes it. */
  nowHours?: number;
};

const WATCH_COLOR = "var(--lane-watch)";
const EXERCISE_COLOR = "var(--lane-exercise)";

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

export function DayTimeline({ items, highlightId, onSelect, nowHours }: DayTimelineProps) {
  const { t } = useTranslation();
  // Continuous play can leave many watches; they stay folded unless asked for (not remembered).
  const [showWatches, setShowWatches] = useState(false);
  const watchCount = items.filter((item) => item.kind === "watch").length;
  const visible = showWatches ? items : items.filter((item) => item.kind !== "watch");

  const toggle =
    watchCount > 0 ? (
      <button type="button" className="day-timeline__watch-toggle" onClick={() => setShowWatches((on) => !on)}>
        {showWatches ? t("timeline_watches_hide") : t("timeline_watches_show", { count: watchCount })}
      </button>
    ) : null;

  if (visible.length === 0) {
    return (
      <>
        <DayRuler items={visible} highlightId={highlightId} colorOf={pointColor} keyOf={itemKey} nowHours={nowHours} />
        <p className="day-timeline__empty">{t("timeline_empty")}</p>
        {toggle}
      </>
    );
  }

  return (
    <>
      <DayRuler items={visible} highlightId={highlightId} colorOf={pointColor} keyOf={itemKey} nowHours={nowHours} />
      <ol className="day-timeline">
        {visible.map((item) => (
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
      {toggle}
    </>
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
          <span className="block tabular-nums text-muted-foreground">{formatDuration(item.log.durationSeconds)}</span>
        </>
      );
  }
}
