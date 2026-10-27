"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  SummaryCardFrame,
  SummaryEmpty,
  usePeriodSummary,
} from "@/features/modules/components/summary-card";
import { isValidPeriod, type Period } from "@/features/modules/period";
import { useModuleSettings } from "@/features/modules/use-module-settings";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { toDayKey } from "@/lib/date/day-key";
import { formatDuration } from "@/lib/date/duration";
import { localIsoAt } from "@/lib/date/local-iso";
import { listExerciseLogsInPeriod, summarizeExercise } from "../exercise-summary";

function isoOf(date: Date): string {
  return localIsoAt(toDayKey(date), date);
}

/** 30 days before `now` (same time of day) to `now`. */
export function defaultPeriod(now: Date = new Date()): Period {
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { start: isoOf(start), end: isoOf(now) };
}

/** "YYYY-MM-DDTHH:mm" for a datetime-local input. */
function toInputValue(iso: string): string {
  return iso.slice(0, 16);
}

/** datetime-local value (wall-clock, no offset) back to a local ISO instant. */
function fromInputValue(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return isoOf(date);
}

async function loadExerciseSummary(period: Period) {
  const [logs, exercises] = await Promise.all([listExerciseLogsInPeriod(period), listAllExercises()]);
  return { summary: summarizeExercise(logs, new Map(exercises.map((exercise) => [exercise.id, exercise.title]))) };
}

function ExerciseSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, loadExerciseSummary);
  const summary = loaded?.summary;
  return (
    <SummaryCardFrame title={t("period_exercise_heading")}>
      {loaded === undefined ? null : summary === null ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_count", { count: summary!.count })}</p>
          <p>{t("period_exercise_total", { duration: formatDuration(summary!.totalSeconds) })}</p>
          <p className="text-muted-foreground">{t("period_exercise_top")}</p>
          <ol className="list-inside list-decimal">
            {summary!.top.map((item) => (
              <li key={item.title}>
                <span>{item.title}</span> {t("period_count", { count: item.count })}
              </li>
            ))}
          </ol>
        </>
      )}
    </SummaryCardFrame>
  );
}

function PeriodSummaryBody({ initialPeriod }: { initialPeriod?: Period }) {
  const { t } = useTranslation();
  const { enabledModules } = useModuleSettings();
  const [period, setPeriod] = useState<Period>(() => initialPeriod ?? defaultPeriod());

  function change(key: keyof Period, value: string) {
    const iso = fromInputValue(value);
    if (iso) setPeriod((current) => ({ ...current, [key]: iso }));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">{t("period_start")}</span>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-background px-2 py-1"
            value={toInputValue(period.start)}
            onChange={(event) => change("start", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">{t("period_end")}</span>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-border bg-background px-2 py-1"
            value={toInputValue(period.end)}
            onChange={(event) => change("end", event.target.value)}
          />
        </label>
      </div>

      {isValidPeriod(period) ? (
        <div className="space-y-3">
          {enabledModules.map((module) => (
            <module.SummaryCard key={module.data.id} period={period} />
          ))}
          <ExerciseSummaryCard period={period} />
        </div>
      ) : (
        <p role="alert" className="text-sm text-destructive">
          {t("period_invalid")}
        </p>
      )}
    </>
  );
}

export type PeriodSummaryDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  initialPeriod?: Period;
};

/** Summary of every enabled module (and exercise) over a chosen period, e.g. for a clinic visit. */
export function PeriodSummaryDialog({ open, onOpenChange, initialPeriod }: PeriodSummaryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("period_summary_title")}</DialogTitle>
        </DialogHeader>
        {/* Content is mounted only while open, so the period starts fresh on every open. */}
        <PeriodSummaryBody initialPeriod={initialPeriod} />
      </DialogContent>
    </Dialog>
  );
}
