"use client";

import { useId, useState, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  FIELD_CLASS,
  TimeField,
  TimelineDialogFooter,
  useSaveAndClose,
} from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { CustomRecord, CustomValue } from "@/lib/types";
import type { RecordFormProps } from "../types";
import { WellnessScoreInput } from "../wellness/wellness-score-input";
import { addCustomRecord, deleteCustomRecord, updateCustomRecord } from "./data";
import { resolveText, type CustomField, type CustomRecordDefinition } from "./definition";
import { coerceValue } from "./values";

type FieldError = "required" | "range";

const CHIP_BASE =
  "h-9 rounded-xl border px-3 text-[0.8125rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CHIP_ON = "border-[var(--tonal-border)] bg-[var(--tonal-bg)] text-[var(--tonal-text)] font-semibold";
const CHIP_OFF = "border-border bg-transparent";

function chipClass(on: boolean): string {
  return `${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`;
}

/** Draft values: numbers stay strings while typing, everything else is stored as its final type. */
type Draft = Record<string, CustomValue>;

function initialDraft(definition: CustomRecordDefinition, record?: CustomRecord): Draft {
  const draft: Draft = {};
  for (const field of definition.fields) {
    const value = coerceValue(field, record?.values[field.id]);
    if (value === undefined) continue;
    draft[field.id] = field.type === "number" ? String(value) : value;
  }
  return draft;
}

/** Draft to the values passed to the data layer, plus an error per field that cannot be saved. */
function readDraft(
  definition: CustomRecordDefinition,
  draft: Draft,
): { values: Record<string, CustomValue>; errors: Record<string, FieldError> } {
  const values: Record<string, CustomValue> = {};
  const errors: Record<string, FieldError> = {};
  for (const field of definition.fields) {
    const value = draft[field.id];
    let present = false;
    switch (field.type) {
      case "number": {
        const text = typeof value === "string" ? value.trim() : "";
        if (text === "") break;
        const n = Number(text);
        if (!Number.isFinite(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
          errors[field.id] = "range";
          continue;
        }
        values[field.id] = n;
        present = true;
        break;
      }
      case "text":
        if (typeof value === "string" && value.trim() !== "") {
          values[field.id] = value;
          present = true;
        }
        break;
      case "boolean":
        // Always saves the switch state (an explicit "no" is a value), so required is always met.
        values[field.id] = value === true;
        present = true;
        break;
      case "multiChoice":
        if (Array.isArray(value) && value.length > 0) {
          values[field.id] = value;
          present = true;
        }
        break;
      default:
        if (value !== undefined && value !== "") {
          values[field.id] = value;
          present = true;
        }
    }
    if (!present && field.required) errors[field.id] = "required";
  }
  return { values, errors };
}

function FieldRow({
  field,
  draft,
  error,
  onChange,
}: {
  field: CustomField;
  draft: CustomValue | undefined;
  error: FieldError | undefined;
  onChange: (value: CustomValue | undefined) => void;
}) {
  const { t, language } = useTranslation();
  const inputId = useId();
  const label = resolveText(field.label, language);

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <Switch id={inputId} checked={draft === true} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    );
  }

  let control: ReactNode;
  switch (field.type) {
    case "number":
    case "text":
      control = (
        <input
          id={inputId}
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          min={field.type === "number" ? field.min : undefined}
          max={field.type === "number" ? field.max : undefined}
          step={field.type === "number" ? (field.step ?? "any") : undefined}
          className={FIELD_CLASS}
          value={typeof draft === "string" ? draft : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
      break;
    case "scale":
      control = (
        <WellnessScoreInput<number>
          label={label}
          value={typeof draft === "number" ? draft : null}
          onChange={onChange}
          levels={field.levels}
          lowLabel={field.lowLabel === undefined ? undefined : resolveText(field.lowLabel, language)}
          highLabel={field.highLabel === undefined ? undefined : resolveText(field.highLabel, language)}
        />
      );
      break;
    case "choice":
      control = (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
          {field.options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={draft === option.id}
              onClick={() => onChange(draft === option.id ? undefined : option.id)}
              className={chipClass(draft === option.id)}
            >
              {resolveText(option.label, language)}
            </button>
          ))}
        </div>
      );
      break;
    case "multiChoice": {
      const selected = Array.isArray(draft) ? draft : [];
      control = (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
          {field.options.map((option) => {
            const on = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onChange(on ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
                className={chipClass(on)}
              >
                {resolveText(option.label, language)}
              </button>
            );
          })}
        </div>
      );
      break;
    }
  }

  const caption = (
    <span className="text-sm font-medium">
      {label}
      {field.type === "number" && field.unit ? <span className="ml-1 text-muted-foreground">({field.unit})</span> : null}
    </span>
  );
  const usesInputId = field.type === "number" || field.type === "text";
  return (
    <div className="space-y-1.5">
      {usesInputId ? (
        <label htmlFor={inputId} className="block">
          {caption}
        </label>
      ) : (
        caption
      )}
      {control}
      {error === "required" ? <p className="text-xs text-destructive">{t("custom_required")}</p> : null}
      {error === "range" && field.type === "number" ? (
        <p className="text-xs text-destructive">
          {t("custom_out_of_range", { min: field.min ?? "", max: field.max ?? "" })}
        </p>
      ) : null}
    </div>
  );
}

/** Time, one input per defined field and a note. Mount it only while its dialog is open. */
export function CustomRecordForm({
  definition,
  onOpenChange,
  date,
  record,
  onSaved,
  onDeleted,
}: RecordFormProps<CustomRecord> & { definition: CustomRecordDefinition }) {
  const { t } = useTranslation();
  const noteId = useId();
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [draft, setDraft] = useState<Draft>(() => initialDraft(definition, record));
  const [note, setNote] = useState(record?.note ?? "");
  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function setValue(id: string, value: CustomValue | undefined) {
    setDraft((current) => {
      const next = { ...current };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  function save() {
    const { values, errors: found } = readDraft(definition, draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const recordedAt = withLocalTime(baseAt, time);
    void run(
      async () => {
        if (!record) return addCustomRecord(definition, { date, recordedAt, values, note });
        const updated: CustomRecord = { ...record, recordedAt, values, note };
        await updateCustomRecord(definition, updated);
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
    await deleteCustomRecord(definition.id, record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      {definition.fields.map((field) => (
        <FieldRow
          key={field.id}
          field={field}
          draft={draft[field.id]}
          error={errors[field.id]}
          onChange={(value) => setValue(field.id, value)}
        />
      ))}
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
