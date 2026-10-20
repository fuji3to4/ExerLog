"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SaveButton } from "@/features/feedback/save-button";
import { useSavedFlash } from "@/features/feedback/use-saved-flash";
import { useTranslation } from "@/features/i18n/use-translation";

/** How long a dialog stays open after a successful save so "✓ saved" is visible. */
export const SAVE_CLOSE_DELAY_MS = 600;

const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Runs a save, flashes the save button, then calls `afterSave` once
 * SAVE_CLOSE_DELAY_MS has passed (typically closing the dialog).
 */
export function useSaveAndClose() {
  const { isSaved, flash } = useSavedFlash();
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<(() => void) | null>(null);

  // If the dialog is closed during the delay, still report the save that already happened.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const finish = pending.current;
      pending.current = null;
      finish?.();
    },
    [],
  );

  const run = useCallback(
    async <T,>(save: () => Promise<T>, afterSave: (result: T) => void) => {
      setIsBusy(true);
      setHasError(false);
      try {
        const result = await save();
        flash();
        pending.current = () => afterSave(result);
        timer.current = setTimeout(() => {
          timer.current = null;
          const finish = pending.current;
          pending.current = null;
          finish?.();
        }, SAVE_CLOSE_DELAY_MS);
      } catch {
        setHasError(true);
        setIsBusy(false);
      }
    },
    [flash],
  );

  return { isSaved, isBusy, hasError, run };
}

export function TimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {t("timeline_edit_time")}
      </label>
      <input
        id={id}
        type="time"
        required
        className={FIELD_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className={FIELD_CLASS}
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
      <label htmlFor={id} className="shrink-0 text-sm">
        {label}
      </label>
    </div>
  );
}

/**
 * Footer with the save button and, when `onDelete` is given, an inline
 * two-step delete (first press asks, second press deletes).
 */
export function TimelineDialogFooter({
  isSaved,
  isBusy,
  hasError,
  canSave,
  onSave,
  onDelete,
}: {
  isSaved: boolean;
  isBusy: boolean;
  hasError: boolean;
  canSave: boolean;
  onSave: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      {hasError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("timeline_save_error")}
        </p>
      ) : null}
      {isConfirming ? (
        <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">{t("timeline_delete_confirm")}</p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" disabled={isDeleting} onClick={confirmDelete}>
              {t("timeline_delete")}
            </Button>
            <Button variant="outline" className="flex-1" disabled={isDeleting} onClick={() => setIsConfirming(false)}>
              {t("timeline_cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {onDelete ? (
            <Button variant="outline" className="text-destructive" disabled={isBusy} onClick={() => setIsConfirming(true)}>
              {t("timeline_delete")}
            </Button>
          ) : null}
          <SaveButton
            isSaved={isSaved}
            className="flex-1"
            // Keep the saved state fully visible (not dimmed) while the dialog waits to close.
            disabled={!canSave || (isBusy && !isSaved)}
            onClick={isBusy ? undefined : onSave}
          >
            {t("timeline_save")}
          </SaveButton>
        </div>
      )}
    </div>
  );
}
