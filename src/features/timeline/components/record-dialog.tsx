"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MeasurementRecord, WellnessEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MeasurementForm } from "./measurement-form";
import { WellnessForm } from "./wellness-entry-dialog";

export type RecordKind = "wellness" | "measurement";

/** Remembers which kind a new record opens on. */
export const RECORD_KIND_STORAGE_KEY = "exerlog-record-kind";

const RECORD_KINDS: readonly RecordKind[] = ["wellness", "measurement"];

export type RecordDialogEditing =
  | { kind: "wellness"; entry: WellnessEntry }
  | { kind: "measurement"; record: MeasurementRecord };

export type RecordDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  date: string;
  editing?: RecordDialogEditing;
  onSaved(id: string): void;
  onDeleted?(): void;
};

function readRecordKind(): RecordKind {
  try {
    return window.localStorage.getItem(RECORD_KIND_STORAGE_KEY) === "measurement" ? "measurement" : "wellness";
  } catch {
    return "wellness";
  }
}

function writeRecordKind(kind: RecordKind) {
  try {
    window.localStorage.setItem(RECORD_KIND_STORAGE_KEY, kind);
  } catch {
    // Not remembering the kind is harmless.
  }
}

/** One dialog for adding or editing a wellness entry or a body measurement record. */
export function RecordDialog(props: RecordDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {/* Mounted only while open, so the kind and form state start fresh on every open. */}
        <RecordDialogBody {...props} />
      </DialogContent>
    </Dialog>
  );
}

function RecordDialogBody({ onOpenChange, date, editing, onSaved, onDeleted }: RecordDialogProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<RecordKind>(() => editing?.kind ?? readRecordKind());

  function chooseKind(next: RecordKind) {
    setKind(next);
    writeRecordKind(next);
  }

  const title = !editing
    ? t("record_add_title")
    : editing.kind === "wellness"
      ? t("timeline_wellness_edit_title")
      : t("measurement_edit_title");

  const form =
    kind === "wellness" ? (
      <WellnessForm
        key="wellness"
        onOpenChange={onOpenChange}
        date={date}
        entry={editing?.kind === "wellness" ? editing.entry : undefined}
        onSaved={(entry) => onSaved(entry.id)}
        onDeleted={onDeleted}
      />
    ) : (
      <MeasurementForm
        key="measurement"
        onOpenChange={onOpenChange}
        date={date}
        record={editing?.kind === "measurement" ? editing.record : undefined}
        onSaved={(record) => onSaved(record.id)}
        onDeleted={onDeleted}
      />
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {editing ? form : <KindTabs value={kind} onChange={chooseKind}>{form}</KindTabs>}
    </>
  );
}

function KindTabs({
  value,
  onChange,
  children,
}: {
  value: RecordKind;
  onChange(kind: RecordKind): void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<RecordKind, HTMLButtonElement | null>>>({});
  const tabId = (kind: RecordKind) => `${baseId}-tab-${kind}`;
  const panelId = `${baseId}-panel`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = RECORD_KINDS[(RECORD_KINDS.indexOf(value) + step + RECORD_KINDS.length) % RECORD_KINDS.length];
    onChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t("record_kind_label")} className="flex gap-1" onKeyDown={onKeyDown}>
        {RECORD_KINDS.map((kind) => {
          const isSelected = kind === value;
          return (
            <button
              key={kind}
              ref={(node) => {
                tabRefs.current[kind] = node;
              }}
              id={tabId(kind)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                "h-10 flex-1 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
              )}
              onClick={() => onChange(kind)}
            >
              {t(kind === "wellness" ? "record_kind_wellness" : "record_kind_measurement")}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)}>
        {children}
      </div>
    </div>
  );
}
