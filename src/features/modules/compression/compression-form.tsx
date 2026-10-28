"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  FIELD_CLASS,
  TimelineDialogFooter,
  useSaveAndClose,
} from "@/features/timeline/components/timeline-dialog-parts";
import { inputValueOfIso, localIsoAt, localIsoFromInput, localIsoNow } from "@/lib/date/local-iso";
import type { CompressionKind, CompressionRecord } from "@/lib/types";
import type { RecordFormProps } from "../types";
import {
  addCompressionRecord,
  COMPRESSION_KINDS,
  deleteCompressionRecord,
  findOpenCompressionRecord,
  updateCompressionRecord,
} from "./data";
import { startLabel } from "./format";

function DateTimeField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        required={required}
        className={FIELD_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * Put-on / take-off form for a compression wear record. A new record of a kind that is still
 * being worn becomes a take-off of that record. Mount it only while its dialog is open.
 */
export function CompressionForm({ onOpenChange, date, record, onSaved, onDeleted }: RecordFormProps<CompressionRecord>) {
  const { t } = useTranslation();
  const noteId = useId();
  const [kind, setKind] = useState<CompressionKind>(record?.kind ?? "garment");
  const [startedAt, setStartedAt] = useState(() =>
    inputValueOfIso(record?.recordedAt ?? localIsoAt(date)),
  );
  const [endedAt, setEndedAt] = useState(() => (record?.endedAt ? inputValueOfIso(record.endedAt) : ""));
  const [note, setNote] = useState(record?.note ?? "");
  const [open, setOpen] = useState<CompressionRecord | undefined>(undefined);
  const [forceNew, setForceNew] = useState(false);
  // New records look up the open record of the chosen kind before they can be saved.
  const [checking, setChecking] = useState(!record);
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();
  const [lookupFailed, setLookupFailed] = useState(false);
  const firstLookup = useRef(true);

  useEffect(() => {
    if (record) return;
    let cancelled = false;
    setChecking(true);
    setLookupFailed(false);
    findOpenCompressionRecord(kind).then(
      (found) => {
        if (cancelled) return;
        setOpen(found);
        setForceNew(false);
        if (found) {
          setEndedAt(inputValueOfIso(localIsoNow()));
        } else if (!firstLookup.current) {
          // Defaults are already in place on the first lookup; only a kind switch resets them.
          setStartedAt(inputValueOfIso(localIsoAt(date)));
          setEndedAt("");
        }
        firstLookup.current = false;
        setChecking(false);
      },
      (error: unknown) => {
        console.error("Failed to look up the open compression record", error);
        // Saving stays off: without the lookup a second open record could be created.
        if (!cancelled) {
          setLookupFailed(true);
          setChecking(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [kind, record, date]);

  const takingOff = !record && open !== undefined && !forceNew;
  const startValue = takingOff ? inputValueOfIso(open.recordedAt) : startedAt;
  const endBeforeStart =
    startValue !== "" && endedAt !== "" && Date.parse(localIsoFromInput(endedAt)) < Date.parse(localIsoFromInput(startValue));
  const canSave = !checking && !lookupFailed && !endBeforeStart && (takingOff ? endedAt !== "" : startedAt !== "");

  function startNew() {
    setForceNew(true);
    setStartedAt(inputValueOfIso(localIsoAt(date)));
    setEndedAt("");
  }

  function save() {
    const endedIso = endedAt === "" ? null : localIsoFromInput(endedAt);
    void run(
      async () => {
        if (takingOff) {
          const updated: CompressionRecord = { ...open, endedAt: endedIso, note: note !== "" ? note : open.note };
          await updateCompressionRecord(updated);
          return updated;
        }
        const recordedAt = localIsoFromInput(startedAt);
        if (!record) return addCompressionRecord({ kind, recordedAt, endedAt: endedIso, note });
        const updated: CompressionRecord = { ...record, kind, recordedAt, endedAt: endedIso, note };
        await updateCompressionRecord(updated);
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
    await deleteCompressionRecord(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" className="flex gap-2">
        {COMPRESSION_KINDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={`h-11 flex-1 rounded-xl border px-2 text-sm ${
              kind === id ? "border-primary bg-primary/10 font-medium" : "border-input"
            }`}
          >
            {t(`compression_kind_${id}` as const)}
          </button>
        ))}
      </div>
      {takingOff ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t(`compression_kind_${kind}` as const)} {startLabel(open)}〜 {t("compression_wearing")}
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={startNew}>
            {t("compression_start_new")}
          </Button>
        </div>
      ) : (
        <DateTimeField label={t("compression_started_at")} value={startedAt} onChange={setStartedAt} required />
      )}
      <DateTimeField label={t("compression_ended_at")} value={endedAt} onChange={setEndedAt} required={takingOff} />
      {lookupFailed ? (
        <p role="alert" className="text-sm text-destructive">
          {t("timeline_save_error")}
        </p>
      ) : null}
      {endBeforeStart ? (
        <p role="alert" className="text-sm text-destructive">
          {t("compression_end_before_start")}
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
