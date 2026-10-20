"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import { deleteExerciseLog, updateExerciseLog } from "@/features/storage/exercise-logs.repository";
import { joinDuration, splitDuration } from "@/lib/date/duration";
import { timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { ExerciseLog, ExerciseLogResult } from "@/lib/types";
import { NumberField, TimeField, TimelineDialogFooter, useSaveAndClose } from "./timeline-dialog-parts";

export type ExerciseLogDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  log: ExerciseLog;
  onSaved(log: ExerciseLog): void;
  onDeleted(): void;
};

const RESULTS: { value: ExerciseLogResult; key: "result_did" | "result_partial" }[] = [
  { value: "did", key: "result_did" },
  { value: "partial", key: "result_partial" },
];

export function ExerciseLogDialog(props: ExerciseLogDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("timeline_exercise_edit_title")}</DialogTitle>
        </DialogHeader>
        <ExerciseLogForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function isValidDuration(minutes: number, seconds: number): boolean {
  return (
    Number.isInteger(minutes) &&
    Number.isInteger(seconds) &&
    minutes >= 0 &&
    seconds >= 0 &&
    seconds <= 59 &&
    joinDuration(minutes, seconds) > 0
  );
}

function ExerciseLogForm({ onOpenChange, log, onSaved, onDeleted }: ExerciseLogDialogProps) {
  const { t } = useTranslation();
  const initial = splitDuration(log.durationSeconds);
  const [time, setTime] = useState(() => timeOfIso(log.performedAt));
  const [result, setResult] = useState<ExerciseLogResult>(log.result);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [seconds, setSeconds] = useState(initial.seconds);
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function save() {
    const updated: ExerciseLog = {
      ...log,
      performedAt: withLocalTime(log.performedAt, time),
      result,
      durationSeconds: joinDuration(minutes, seconds),
    };
    void run(
      async () => {
        await updateExerciseLog(updated);
        return updated;
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    await deleteExerciseLog(log.id);
    onOpenChange(false);
    onDeleted();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("timeline_result")}</p>
        <div role="group" aria-label={t("timeline_result")} className="grid grid-cols-2 gap-2">
          {RESULTS.map((option) => (
            <Button
              key={option.value}
              variant={result === option.value ? "default" : "outline"}
              aria-pressed={result === option.value}
              onClick={() => setResult(option.value)}
            >
              {t(option.key)}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("timeline_duration")}</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t("timeline_duration_minutes")} value={minutes} min={0} onChange={setMinutes} />
          <NumberField
            label={t("timeline_duration_seconds")}
            value={seconds}
            min={0}
            max={59}
            onChange={setSeconds}
          />
        </div>
      </div>
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={time !== "" && isValidDuration(minutes, seconds)}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}
