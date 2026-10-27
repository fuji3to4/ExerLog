"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  buildValues,
  initialDrafts,
  MeasurementInput,
  MeasurementNote,
  parseDraft,
  type Draft,
  type MeasurementFormProps,
} from "@/features/measurements/components/measurement-input";
import { readCircumferenceLimb, writeCircumferenceLimb, type Limb } from "@/features/measurements/circumference";
import {
  CIRCUMFERENCE_ITEMS,
  formatMeasurementValue,
  type MeasurementItem,
} from "@/features/measurements/measurement-items";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { MeasurementRecord } from "@/lib/types";
import { CircumferenceFields } from "./circumference-fields";
import { CircumferenceHelpDialog } from "./circumference-help-dialog";
import { circumferenceRepository } from "./data";

export type { MeasurementFormProps } from "@/features/measurements/components/measurement-input";

/** Editing opens on the limb the record has values for (arm first); otherwise the remembered limb. */
function initialLimb(record: MeasurementRecord | undefined): Limb {
  const limbs = CIRCUMFERENCE_ITEMS.filter((item) => record?.values[item.id] !== undefined).map(
    (item) => item.circumference?.limb,
  );
  if (limbs.includes("arm")) return "arm";
  if (limbs.includes("leg")) return "leg";
  return readCircumferenceLimb();
}

/**
 * Time, the arm|leg switch over the circumference grid, the measuring help and a note.
 * Drafts of the hidden limb are kept and still validated and saved.
 */
export function CircumferenceForm({ onOpenChange, date, record, onSaved, onDeleted }: MeasurementFormProps) {
  const { t } = useTranslation();
  // For a new record the base instant is "now" on `date`, taken when the form mounts.
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initialDrafts(CIRCUMFERENCE_ITEMS, record));
  const [note, setNote] = useState(record?.note ?? "");
  const [limb, setLimb] = useState<Limb>(() => initialLimb(record));
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  const recordedAt = time === "" ? null : withLocalTime(baseAt, time);
  const editingId = record?.id;

  useEffect(() => {
    if (!recordedAt) return;
    let isCurrent = true;
    // The record being edited must not count as its own "previous" value.
    circumferenceRepository
      .findPreviousValues(recordedAt, { excludeId: editingId })
      .then((previousValues) => {
        if (isCurrent) setPrevious(previousValues);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      isCurrent = false;
    };
  }, [recordedAt, editingId]);

  function isInvalid(item: MeasurementItem): boolean {
    return parseDraft(item, drafts[item.id], record?.values[item.id]).state === "invalid";
  }

  const values = buildValues(CIRCUMFERENCE_ITEMS, drafts, record);
  const canSave = recordedAt !== null && values !== null && Object.keys(values).length > 0;

  const invalidLimbs = new Set<Limb>();
  for (const item of CIRCUMFERENCE_ITEMS) {
    if (item.circumference && isInvalid(item)) invalidLimbs.add(item.circumference.limb);
  }

  function chooseLimb(next: Limb) {
    setLimb(next);
    writeCircumferenceLimb(next);
  }

  function placeholderFor(item: MeasurementItem): string | undefined {
    const value = previous[item.id];
    return value === undefined
      ? undefined
      : t("measurement_previous", { value: formatMeasurementValue(item, value) });
  }

  function save() {
    if (!canSave || !values || !recordedAt) return;
    const savedValues = values;
    void run(
      async () => {
        if (!record) {
          return circumferenceRepository.add({ date, recordedAt, values: savedValues, note });
        }
        const updated: MeasurementRecord = { ...record, recordedAt, values: savedValues, note };
        await circumferenceRepository.update(updated);
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
    await circumferenceRepository.remove(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <CircumferenceFields
        limb={limb}
        onLimbChange={chooseLimb}
        invalidLimbs={invalidLimbs}
        renderInput={(item) => (
          <MeasurementInput
            item={item}
            draft={drafts[item.id]}
            isInvalid={isInvalid(item)}
            placeholder={placeholderFor(item)}
            onChange={(draft) => setDrafts((current) => ({ ...current, [item.id]: draft }))}
            ariaLabel={t(item.labelKey)}
            // Compact so the "前回 150.0" placeholder fits a narrow grid cell; the value stays text-base (no iOS zoom).
            className="px-2 placeholder:text-sm"
          />
        )}
        onHelp={() => setIsHelpOpen(true)}
      />
      <CircumferenceHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} limb={limb} />
      <MeasurementNote value={note} onChange={setNote} />
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={canSave}
        onSave={save}
        onDelete={record ? remove : undefined}
      />
    </div>
  );
}
