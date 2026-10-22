"use client";

import { useEffect, useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  formatMeasurementValue,
  MEASUREMENT_ITEMS,
  type MeasurementItem,
} from "@/features/measurements/measurement-items";
import { calculateBmi } from "@/features/metrics/bmi";
import {
  addMeasurement,
  deleteMeasurement,
  findLatestHeightAt,
  findPreviousValues,
  updateMeasurement,
} from "@/features/storage/measurements.repository";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { MeasurementRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FIELD_CLASS, TimeField, TimelineDialogFooter, useSaveAndClose } from "./timeline-dialog-parts";

export type MeasurementFormProps = {
  onOpenChange(open: boolean): void;
  date: string;
  record?: MeasurementRecord;
  onSaved(record: MeasurementRecord): void;
  onDeleted?(): void;
};

type Draft = { raw: string; badInput: boolean };

type ParsedValue = { state: "empty" } | { state: "invalid" } | { state: "ok"; value: number };

/** Empty, invalid (not a number, out of range, too many decimals) or a value to save. */
function parseDraft(item: MeasurementItem, draft: Draft | undefined): ParsedValue {
  if (draft?.badInput) return { state: "invalid" };
  const raw = draft?.raw.trim() ?? "";
  if (raw === "") return { state: "empty" };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < item.min || value > item.max) return { state: "invalid" };
  const scaled = value * 10 ** item.decimals;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) return { state: "invalid" };
  return { state: "ok", value };
}

/** Time, one number field per known item, and a note. Mount it only while its dialog is open. */
export function MeasurementForm({ onOpenChange, date, record, onSaved, onDeleted }: MeasurementFormProps) {
  const { t } = useTranslation();
  const noteId = useId();
  // For a new record the base instant is "now" on `date`, taken when the form mounts.
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const initial: Record<string, Draft> = {};
    for (const item of MEASUREMENT_ITEMS) {
      const value = record?.values[item.id];
      if (value !== undefined) initial[item.id] = { raw: String(value), badInput: false };
    }
    return initial;
  });
  const [note, setNote] = useState(record?.note ?? "");
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const [fallbackHeight, setFallbackHeight] = useState<number | null>(null);
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  const recordedAt = time === "" ? null : withLocalTime(baseAt, time);
  const isEditing = record !== undefined;

  useEffect(() => {
    if (!recordedAt) return;
    let isCurrent = true;
    Promise.all([findPreviousValues(recordedAt), isEditing ? null : findLatestHeightAt(recordedAt)])
      .then(([previousValues, latestHeight]) => {
        if (!isCurrent) return;
        setPrevious(previousValues);
        // When editing, the record's own stored height must not stand in for a cleared field.
        setFallbackHeight(isEditing ? (previousValues.height ?? null) : latestHeight);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      isCurrent = false;
    };
  }, [recordedAt, isEditing]);

  const parsed = Object.fromEntries(
    MEASUREMENT_ITEMS.map((item) => [item.id, parseDraft(item, drafts[item.id])]),
  ) as Record<string, ParsedValue>;

  // Keep values of items not in the list; drop listed items whose field is empty.
  let values: Record<string, number> | null = { ...(record?.values ?? {}) };
  for (const item of MEASUREMENT_ITEMS) {
    const entry = parsed[item.id];
    if (entry.state === "invalid") {
      values = null;
      break;
    }
    if (entry.state === "empty") delete values[item.id];
    else values[item.id] = entry.value;
  }
  const canSave = recordedAt !== null && values !== null && Object.keys(values).length > 0;

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
          return addMeasurement({ date, recordedAt, values: savedValues, note });
        }
        const updated: MeasurementRecord = { ...record, recordedAt, values: savedValues, note };
        await updateMeasurement(updated);
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
    await deleteMeasurement(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div className="space-y-2">
        {MEASUREMENT_ITEMS.map((item) => (
          <MeasurementField
            key={item.id}
            item={item}
            draft={drafts[item.id]}
            isInvalid={parsed[item.id].state === "invalid"}
            placeholder={
              previous[item.id] === undefined
                ? undefined
                : t("measurement_previous", { value: formatMeasurementValue(item, previous[item.id]) })
            }
            onChange={(draft) => setDrafts((current) => ({ ...current, [item.id]: draft }))}
          />
        ))}
      </div>
      {bmiText ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {bmiText}
        </p>
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
        canSave={canSave}
        onSave={save}
        onDelete={record ? remove : undefined}
      />
    </div>
  );
}

function MeasurementField({
  item,
  draft,
  isInvalid,
  placeholder,
  onChange,
}: {
  item: MeasurementItem;
  draft: Draft | undefined;
  isInvalid: boolean;
  placeholder?: string;
  onChange(draft: Draft): void;
}) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-24 shrink-0 text-sm font-medium">
        {t(item.labelKey)}
      </label>
      <input
        id={id}
        type="number"
        inputMode={item.decimals > 0 ? "decimal" : "numeric"}
        min={item.min}
        max={item.max}
        step={10 ** -item.decimals}
        placeholder={placeholder}
        aria-invalid={isInvalid || undefined}
        className={cn(FIELD_CLASS, "text-right", isInvalid && "border-destructive")}
        value={draft?.raw ?? ""}
        onChange={(event) =>
          onChange({ raw: event.target.value, badInput: event.target.validity.badInput })
        }
      />
      <span className="w-8 shrink-0 text-sm text-muted-foreground">{item.unit}</span>
    </div>
  );
}
