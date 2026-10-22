"use client";

import { useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { WellnessScoreInput } from "@/features/self-care/components/wellness-score-input";
import {
  addWellnessEntry,
  deleteWellnessEntry,
  updateWellnessEntry,
} from "@/features/storage/wellness-entries.repository";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { WellnessEntry, WellnessScore } from "@/lib/types";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "./timeline-dialog-parts";

type WellnessEntryDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  date: string;
  entry?: WellnessEntry;
  onSaved(entry: WellnessEntry): void;
  onDeleted?(): void;
};

export type WellnessFormProps = Omit<WellnessEntryDialogProps, "open">;

const DEFAULT_SCORE: WellnessScore = 3;

/** Time, body/mind scores and note for a wellness entry. Mount it only while its dialog is open. */
export function WellnessForm({ onOpenChange, date, entry, onSaved, onDeleted }: WellnessFormProps) {
  const { t } = useTranslation();
  const noteId = useId();
  // For a new entry the base instant is "now" on `date`, taken when the dialog opens.
  const [baseAt] = useState(() => entry?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [physical, setPhysical] = useState<WellnessScore>(entry?.physicalScore ?? DEFAULT_SCORE);
  const [mental, setMental] = useState<WellnessScore>(entry?.mentalScore ?? DEFAULT_SCORE);
  const [note, setNote] = useState(entry?.note ?? "");
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function save() {
    const recordedAt = withLocalTime(baseAt, time);
    void run(
      async () => {
        if (!entry) {
          return addWellnessEntry({ date, recordedAt, physicalScore: physical, mentalScore: mental, note });
        }
        const updated: WellnessEntry = { ...entry, recordedAt, physicalScore: physical, mentalScore: mental, note };
        await updateWellnessEntry(updated);
        return updated;
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    if (!entry) return;
    await deleteWellnessEntry(entry.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("timeline_physical")}</p>
        <WellnessScoreInput label={t("timeline_physical")} value={physical} onChange={setPhysical} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("timeline_mental")}</p>
        <WellnessScoreInput label={t("timeline_mental")} value={mental} onChange={setMental} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          {t("timeline_note")}
        </label>
        <textarea
          id={noteId}
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={time !== ""}
        onSave={save}
        onDelete={entry ? remove : undefined}
      />
    </div>
  );
}
