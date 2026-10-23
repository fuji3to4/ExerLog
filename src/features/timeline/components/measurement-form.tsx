"use client";

import { useEffect, useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  isCircumferenceItem,
  readCircumferenceLimb,
  writeCircumferenceLimb,
  type Limb,
} from "@/features/measurements/circumference";
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
import { CircumferenceFields } from "./circumference-fields";
import { CircumferenceHelpDialog } from "./circumference-help-dialog";
import { FIELD_CLASS, TimeField, TimelineDialogFooter, useSaveAndClose } from "./timeline-dialog-parts";

export type MeasurementFormProps = {
  onOpenChange(open: boolean): void;
  date: string;
  record?: MeasurementRecord;
  onSaved(record: MeasurementRecord): void;
  onDeleted?(): void;
};

type Draft = { raw: string; badInput: boolean };

const BASIC_ITEMS = MEASUREMENT_ITEMS.filter((item) => !isCircumferenceItem(item));

/** Editing opens on the limb the record has values for (arm first); otherwise the remembered limb. */
function initialLimb(record: MeasurementRecord | undefined): Limb {
  const limbs = MEASUREMENT_ITEMS.filter((item) => record?.values[item.id] !== undefined).map(
    (item) => item.circumference?.limb,
  );
  if (limbs.includes("arm")) return "arm";
  if (limbs.includes("leg")) return "leg";
  return readCircumferenceLimb();
}

type ParsedValue = { state: "empty" } | { state: "invalid" } | { state: "ok"; value: number };

/**
 * Empty, invalid (not a number, out of range, too many decimals) or a value to save.
 * A field still holding its stored value is always accepted, so a record imported
 * with e.g. 60.25 can be edited (note, time) without being forced to change it.
 */
function parseDraft(item: MeasurementItem, draft: Draft | undefined, stored: number | undefined): ParsedValue {
  if (draft?.badInput) return { state: "invalid" };
  const raw = draft?.raw.trim() ?? "";
  if (raw === "") return { state: "empty" };
  const value = Number(raw);
  if (stored !== undefined && raw === String(stored)) return { state: "ok", value: stored };
  if (!Number.isFinite(value) || value < item.min || value > item.max) return { state: "invalid" };
  const scaled = value * 10 ** item.decimals;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-6) return { state: "invalid" };
  return { state: "ok", value };
}

/**
 * Time, one number field per basic item, the arm or leg circumference grid, and a note.
 * Drafts of the hidden limb are kept and still validated and saved.
 * Mount it only while its dialog is open.
 */
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
  const [limb, setLimb] = useState<Limb>(() => initialLimb(record));
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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
    Promise.all([findPreviousValues(recordedAt, options), findLatestHeightAt(recordedAt, options)])
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

  const parsed = Object.fromEntries(
    MEASUREMENT_ITEMS.map((item) => [item.id, parseDraft(item, drafts[item.id], record?.values[item.id])]),
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

  const invalidLimbs = new Set<Limb>();
  for (const item of MEASUREMENT_ITEMS) {
    if (item.circumference && parsed[item.id].state === "invalid") invalidLimbs.add(item.circumference.limb);
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

  function inputProps(item: MeasurementItem) {
    return {
      item,
      draft: drafts[item.id],
      isInvalid: parsed[item.id].state === "invalid",
      placeholder: placeholderFor(item),
      onChange: (draft: Draft) => setDrafts((current) => ({ ...current, [item.id]: draft })),
    };
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
        {BASIC_ITEMS.map((item) => (
          <MeasurementField key={item.id} {...inputProps(item)} />
        ))}
      </div>
      {bmiText ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {bmiText}
        </p>
      ) : null}
      <CircumferenceFields
        limb={limb}
        onLimbChange={chooseLimb}
        invalidLimbs={invalidLimbs}
        renderInput={(item) => <MeasurementInput {...inputProps(item)} ariaLabel={t(item.labelKey)} />}
        onHelp={() => setIsHelpOpen(true)}
      />
      <CircumferenceHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} limb={limb} />
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

type MeasurementInputProps = {
  item: MeasurementItem;
  draft: Draft | undefined;
  isInvalid: boolean;
  placeholder?: string;
  onChange(draft: Draft): void;
};

function MeasurementField(props: MeasurementInputProps) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-24 shrink-0 text-sm font-medium">
        {t(props.item.labelKey)}
      </label>
      <MeasurementInput {...props} id={id} />
      <span className="w-8 shrink-0 text-sm text-muted-foreground">{props.item.unit}</span>
    </div>
  );
}

/** The number input itself; labelled by a <label> via `id`, or by `ariaLabel`. */
function MeasurementInput({
  item,
  draft,
  isInvalid,
  placeholder,
  onChange,
  id,
  ariaLabel,
}: MeasurementInputProps & { id?: string; ariaLabel?: string }) {
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="number"
      inputMode={item.decimals > 0 ? "decimal" : "numeric"}
      min={item.min}
      max={item.max}
      step={10 ** -item.decimals}
      placeholder={placeholder}
      aria-invalid={isInvalid || undefined}
      className={cn(FIELD_CLASS, "text-right", isInvalid && "border-destructive")}
      value={draft?.raw ?? ""}
      onChange={(event) => onChange({ raw: event.target.value, badInput: event.target.validity.badInput })}
    />
  );
}
