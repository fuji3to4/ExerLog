"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { AddRecordMenu } from "@/features/modules/components/add-record-menu";
import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { getRecordModule } from "@/features/modules/registry";
import type { RecordModule } from "@/features/modules/types";
import { useModuleSettings } from "@/features/modules/use-module-settings";
import { toDayKey } from "@/lib/date/day-key";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "../build-timeline";
import type { DayTimelineState } from "../use-day-timeline";
import { DayTimeline } from "./day-timeline";
import { ExerciseLogDialog } from "./exercise-log-dialog";
import { WatchEventDialog } from "./watch-event-dialog";

export type TimelineSectionProps = {
  date: string;
  timeline: DayTimelineState;
  onChanged?(): void;
};

export function TimelineSection({ date, timeline, onChanged }: TimelineSectionProps) {
  const { t } = useTranslation();
  const { enabledModules } = useModuleSettings();
  const [adding, setAdding] = useState<RecordModule | null>(null);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  // Logging from the library always records today, so offer it only on today's timeline.
  const isToday = date === toDayKey(new Date());
  const selectedModule = selected?.kind === "module" ? getRecordModule(selected.moduleId) : undefined;

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
        <AddRecordMenu className="flex-1" modules={enabledModules} onChoose={setAdding} />
        {isToday ? (
          <Link href="/library" className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
            {t("timeline_choose_video")}
          </Link>
        ) : null}
      </div>

      {timeline.isLoaded ? (
        <DayTimeline items={timeline.items} highlightId={timeline.highlightId} onSelect={setSelected} />
      ) : null}

      {adding ? (
        <ModuleRecordDialog
          key={adding.data.id}
          module={adding}
          open
          onOpenChange={(open) => {
            if (!open) setAdding(null);
          }}
          date={date}
          onSaved={(id) => void refresh(id)}
        />
      ) : null}

      {selected?.kind === "module" && selectedModule ? (
        <ModuleRecordDialog
          key={`${selected.moduleId}:${selected.id}`}
          module={selectedModule}
          open
          onOpenChange={closeSelected}
          date={date}
          record={selected.record}
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
