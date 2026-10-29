"use client";

import { useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  FIELD_CLASS,
  TimeField,
  TimelineDialogFooter,
  useSaveAndClose,
} from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { SelfCareItemId, SelfCareRecord } from "@/lib/types";
import type { RecordFormProps } from "../types";
import { addSelfCareRecord, deleteSelfCareRecord, SELF_CARE_ITEMS, updateSelfCareRecord } from "./data";

/** Time, item, minutes (exercise only) and note for a self-care record. Mount it only while its dialog is open. */
export function SelfCareForm({ onOpenChange, date, record, onSaved, onDeleted }: RecordFormProps<SelfCareRecord>) {
  const { t } = useTranslation();
  const noteId = useId();
  const minutesId = useId();
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [item, setItem] = useState<SelfCareItemId>(record?.item ?? "skincare");
  const [minutes, setMinutes] = useState(record?.minutes != null ? String(record.minutes) : "");
  const [note, setNote] = useState(record?.note ?? "");
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function save() {
    const recordedAt = withLocalTime(baseAt, time);
    const parsed = Number(minutes);
    const savedMinutes = item === "exercise" && minutes !== "" && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    void run(
      async () => {
        if (!record) return addSelfCareRecord({ date, recordedAt, item, minutes: savedMinutes, note });
        const updated: SelfCareRecord = { ...record, recordedAt, item, minutes: savedMinutes, note };
        await updateSelfCareRecord(updated);
        return updated;
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    if (!record) return;
    await deleteSelfCareRecord(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div role="radiogroup" className="flex gap-2">
        {SELF_CARE_ITEMS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={item === id}
            onClick={() => setItem(id)}
            className={`h-9 flex-1 rounded-xl border px-2 text-[0.8125rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item === id ? "border-[var(--tonal-border)] bg-[var(--tonal-bg)] text-[var(--tonal-text)] font-semibold" : "border-border bg-transparent"
            }`}
          >
            {t(`selfcare_item_${id}` as const)}
          </button>
        ))}
      </div>
      {item === "exercise" ? (
        <div className="space-y-1.5">
          <label htmlFor={minutesId} className="text-sm font-medium">
            {t("selfcare_minutes")}
          </label>
          <input
            id={minutesId}
            type="number"
            min={1}
            inputMode="numeric"
            className={FIELD_CLASS}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </div>
      ) : null}
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
        onDelete={record ? remove : undefined}
      />
    </div>
  );
}
