"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  buildValues,
  initialDrafts,
  MeasurementField,
  MeasurementNote,
  parseDraft,
  type Draft,
  type MeasurementFormProps,
  type ParsedValue,
} from "@/features/measurements/components/measurement-input";
import { BODY_ITEMS, formatMeasurementValue, type MeasurementItem } from "@/features/measurements/measurement-items";
import { calculateBmi } from "@/features/metrics/bmi";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { MeasurementRecord } from "@/lib/types";
import { bodyRepository } from "./data";

export type { MeasurementFormProps } from "@/features/measurements/components/measurement-input";

/** Time, one number field per body item, the BMI line and a note. */
export function BodyForm({ onOpenChange, date, record, onSaved, onDeleted }: MeasurementFormProps) {
  const { t } = useTranslation();
  // For a new record the base instant is "now" on `date`, taken when the form mounts.
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initialDrafts(BODY_ITEMS, record));
  const [note, setNote] = useState(record?.note ?? "");
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const [fallbackHeight, setFallbackHeight] = useState<number | null>(null);
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  const recordedAt = time === "" ? null : withLocalTime(baseAt, time);
  const editingId = record?.id;

  useEffect(() => {
    if (!recordedAt) return;
    let isCurrent = true;
    // The record being edited must not count as its own "previous" value or height.
    const options = { excludeId: editingId };
    Promise.all([
      bodyRepository.findPreviousValues(recordedAt, options),
      bodyRepository.findLatestValueAt("height", recordedAt, options),
    ])
      .then(([previousValues, latestHeight]) => {
        if (!isCurrent) return;
        setPrevious(previousValues);
        setFallbackHeight(latestHeight);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      isCurrent = false;
    };
  }, [recordedAt, editingId]);

  const parsed: Record<string, ParsedValue> = Object.fromEntries(
    BODY_ITEMS.map((item) => [item.id, parseDraft(item, drafts[item.id], record?.values[item.id])] as const),
  );
  const values = buildValues(BODY_ITEMS, drafts, record);
  const canSave = recordedAt !== null && values !== null && Object.keys(values).length > 0;

  function placeholderFor(item: MeasurementItem): string | undefined {
    const value = previous[item.id];
    return value === undefined
      ? undefined
      : t("measurement_previous", { value: formatMeasurementValue(item, value) });
  }

  const weight = parsed.weight;
  const enteredHeight = parsed.height;
  let bmiText: string | null = null;
  if (weight?.state === "ok") {
    const height = enteredHeight?.state === "ok" ? enteredHeight.value : fallbackHeight;
    const bmi = height === null ? null : calculateBmi(weight.value, height);
    bmiText = bmi === null ? t("bmi_need_height") : t("bmi_value", { value: bmi.toFixed(1) });
  }

  function save() {
    if (!canSave || !values || !recordedAt) return;
    const savedValues = values;
    void run(
      async () => {
        if (!record) {
          return bodyRepository.add({ date, recordedAt, values: savedValues, note });
        }
        const updated: MeasurementRecord = { ...record, recordedAt, values: savedValues, note };
        await bodyRepository.update(updated);
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
    await bodyRepository.remove(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div className="space-y-2">
        {BODY_ITEMS.map((item) => (
          <MeasurementField
            key={item.id}
            item={item}
            draft={drafts[item.id]}
            isInvalid={parsed[item.id]?.state === "invalid"}
            placeholder={placeholderFor(item)}
            onChange={(draft) => setDrafts((current) => ({ ...current, [item.id]: draft }))}
          />
        ))}
      </div>
      {bmiText ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {bmiText}
        </p>
      ) : null}
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
