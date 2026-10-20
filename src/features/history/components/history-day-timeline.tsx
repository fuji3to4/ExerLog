"use client";

import { TimelineSection } from "@/features/timeline/components/timeline-section";
import { useDayTimeline } from "@/features/timeline/use-day-timeline";

type HistoryDayTimelineProps = {
  date: string;
  onChanged(): void;
};

/** The selected history day's timeline (same add/edit/delete as Today). */
export function HistoryDayTimeline({ date, onChanged }: HistoryDayTimelineProps) {
  const timeline = useDayTimeline(date);
  return <TimelineSection date={date} timeline={timeline} onChanged={onChanged} />;
}
