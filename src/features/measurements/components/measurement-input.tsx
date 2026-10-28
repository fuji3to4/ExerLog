"use client";

import { useEffect, useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { FIELD_CLASS, useSaveAndClose } from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { MeasurementRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMeasurementValue, type MeasurementItem } from "../measurement-items";
import type { MeasurementRepository } from "../measurement-repository";

/** Props shared by the body and circumference forms. Mount a form only while its dialog is open. */
export type MeasurementFormProps = {
  onOpenChange(open: boolean): void;
  date: string;
  record?: MeasurementRecord;
  onSaved(record: MeasurementRecord): void;
  onDeleted?(): void;
};

/**
 * State and actions shared by the body and circumference forms: time, drafts of `items`,
 * note, previous values from `repository`, validation, save and delete.
 */
export function useMeasurementForm({
  repository,
  items,
  date,
  record,
  onOpenChange,
  onSaved,
  onDeleted,
}: MeasurementFormProps & { repository: MeasurementRepository; items: readonly MeasurementItem[] }) {
  const { t } = useTranslation();
  // For a new record the base instant is "now" on `date`, taken when the form mounts.
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initialDrafts(items, record));
  const [note, setNote] = useState(record?.note ?? "");
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  const recordedAt = time === "" ? null : withLocalTime(baseAt, time);
  const editingId = record?.id;

  useEffect(() => {
    if (!recordedAt) return;
    let isCurrent = true;
    // The record being edited must not count as its own "previous" value.
    repository
      .findPreviousValues(recordedAt, { excludeId: editingId })
      .then((previousValues) => {
        if (isCurrent) setPrevious(previousValues);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      isCurrent = false;
    };
  }, [repository, recordedAt, editingId]);

  const parsed: Record<string, ParsedValue> = Object.fromEntries(
    items.map((item) => [item.id, parseDraft(item, drafts[item.id], record?.values[item.id])] as const),
  );
  const values = buildValues(items, drafts, record);
  const canSave = recordedAt !== null && values !== null && Object.keys(values).length > 0;

  function inputProps(item: MeasurementItem): MeasurementInputProps {
    const value = previous[item.id];
    return {
      item,
      draft: drafts[item.id],
      isInvalid: parsed[item.id]?.state === "invalid",
      placeholder:
        value === undefined ? undefined : t("measurement_previous", { value: formatMeasurementValue(item, value) }),
      onChange: (draft) => setDrafts((current) => ({ ...current, [item.id]: draft })),
    };
  }

  function save() {
    if (!canSave || !values || !recordedAt) return;
    const savedValues = values;
    void run(
      async () => {
        if (!record) {
          return repository.add({ date, recordedAt, values: savedValues, note });
        }
        const updated: MeasurementRecord = { ...record, recordedAt, values: savedValues, note };
        await repository.update(updated);
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
    await repository.remove(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return {
    time,
    setTime,
    note,
    setNote,
    recordedAt,
    parsed,
    inputProps,
    /** Props for TimelineDialogFooter. */
    footerProps: {
      isSaved,
      isBusy,
      hasError,
      canSave,
      onSave: save,
      onDelete: record ? remove : undefined,
    },
  };
}

/** What a number field holds: its text, and whether the browser saw unparsable input. */
export type Draft = { raw: string; badInput: boolean };

export type ParsedValue = { state: "empty" } | { state: "invalid" } | { state: "ok"; value: number };

/**
 * Empty, invalid (not a number, out of range, too many decimals) or a value to save.
 * A field still holding its stored value is always accepted, so a record imported
 * with e.g. 60.25 can be edited (note, time) without being forced to change it.
 */
export function parseDraft(item: MeasurementItem, draft: Draft | undefined, stored: number | undefined): ParsedValue {
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
 * The values to save from the drafts of `items`, or null when one of them is invalid.
 * Values of ids not in `items` are carried over from `record`; an item whose field is empty is dropped.
 */
export function buildValues(
  items: readonly MeasurementItem[],
  drafts: Record<string, Draft>,
  record?: MeasurementRecord,
): Record<string, number> | null {
  const values: Record<string, number> = { ...(record?.values ?? {}) };
  for (const item of items) {
    const entry = parseDraft(item, drafts[item.id], record?.values[item.id]);
    if (entry.state === "invalid") return null;
    if (entry.state === "empty") delete values[item.id];
    else values[item.id] = entry.value;
  }
  return values;
}

/** Initial drafts: the record's stored value of each item. */
export function initialDrafts(items: readonly MeasurementItem[], record?: MeasurementRecord): Record<string, Draft> {
  const drafts: Record<string, Draft> = {};
  for (const item of items) {
    const value = record?.values[item.id];
    if (value !== undefined) drafts[item.id] = { raw: String(value), badInput: false };
  }
  return drafts;
}

export type MeasurementInputProps = {
  item: MeasurementItem;
  draft: Draft | undefined;
  isInvalid: boolean;
  placeholder?: string;
  onChange(draft: Draft): void;
};

/** Label, number input and unit on one row. */
export function MeasurementField(props: MeasurementInputProps) {
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

/** The free-text note under a measurement form. */
export function MeasurementNote({ value, onChange }: { value: string; onChange(value: string): void }) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {t("timeline_note")}
      </label>
      <textarea
        id={id}
        rows={2}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** The number input itself; labelled by a <label> via `id`, or by `ariaLabel`. `className` adds to the field style. */
export function MeasurementInput({
  item,
  draft,
  isInvalid,
  placeholder,
  onChange,
  id,
  ariaLabel,
  className,
}: MeasurementInputProps & { id?: string; ariaLabel?: string; className?: string }) {
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
      className={cn(FIELD_CLASS, "text-right", className, isInvalid && "border-destructive")}
      value={draft?.raw ?? ""}
      onChange={(event) => onChange({ raw: event.target.value, badInput: event.target.validity.badInput })}
    />
  );
}
