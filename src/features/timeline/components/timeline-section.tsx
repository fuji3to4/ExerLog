"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "../build-timeline";
import type { DayTimelineState } from "../use-day-timeline";
import { DayTimeline } from "./day-timeline";
import { ExerciseLogDialog } from "./exercise-log-dialog";
import { WatchEventDialog } from "./watch-event-dialog";
import { WellnessEntryDialog } from "./wellness-entry-dialog";

export type TimelineSectionProps = {
  date: string;
  timeline: DayTimelineState;
  onChanged?(): void;
};

export function TimelineSection({ date, timeline, onChanged }: TimelineSectionProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  // Logging from the library always records today, so offer it only on today's timeline.
  const isToday = date === toDayKey(new Date());

  async function refresh(highlightId?: string) {
    await timeline.reload(highlightId);
    onChanged?.();
  }

  function closeSelected(open: boolean) {
    if (!open) setSelected(null);
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setIsAdding(true)}>
          {t("timeline_add_wellness")}
        </Button>
        {isToday ? (
          <Link href="/library" className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
            {t("timeline_choose_video")}
          </Link>
        ) : null}
      </div>

      {timeline.isLoaded ? (
        <DayTimeline items={timeline.items} highlightId={timeline.highlightId} onSelect={setSelected} />
      ) : null}

      <WellnessEntryDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        date={date}
        onSaved={(entry) => void refresh(entry.id)}
      />

      {selected?.kind === "wellness" ? (
        <WellnessEntryDialog
          key={selected.id}
          open
          onOpenChange={closeSelected}
          date={date}
          entry={selected.entry}
          onSaved={() => void refresh()}
          onDeleted={() => void refresh()}
        />
      ) : null}
      {selected?.kind === "exercise" ? (
        <ExerciseLogDialog
          key={selected.id}
          open
          onOpenChange={closeSelected}
          log={selected.log}
          onSaved={() => void refresh()}
          onDeleted={() => void refresh()}
        />
      ) : null}
      {selected?.kind === "watch" ? (
        <WatchEventDialog
          key={selected.id}
          open
          onOpenChange={closeSelected}
          event={selected.event}
          onSaved={() => void refresh()}
          onDeleted={() => void refresh()}
        />
      ) : null}
    </section>
  );
}
