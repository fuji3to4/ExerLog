"use client";

import { useModuleSettings } from "@/features/modules/use-module-settings";
import { TimelineSection } from "@/features/timeline/components/timeline-section";
import { useDayTimeline } from "@/features/timeline/use-day-timeline";

type HistoryDayTimelineProps = {
  date: string;
  onChanged(): void;
};

/** The selected history day's timeline (same add/edit/delete as Today). */
export function HistoryDayTimeline({ date, onChanged }: HistoryDayTimelineProps) {
  const { enabledModules } = useModuleSettings();
  const timeline = useDayTimeline(date, enabledModules);
  return <TimelineSection date={date} timeline={timeline} onChanged={onChanged} />;
}
