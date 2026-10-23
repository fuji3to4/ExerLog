"use client";

import { useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MeasurementRecord, WellnessEntry } from "@/lib/types";
import { MeasurementForm } from "./measurement-form";
import { SegmentedTabs } from "./segmented-tabs";
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
  return (
    <SegmentedTabs
      options={RECORD_KINDS}
      value={value}
      onChange={onChange}
      label={t("record_kind_label")}
      renderTab={(kind) => t(kind === "wellness" ? "record_kind_wellness" : "record_kind_measurement")}
    >
      {children}
    </SegmentedTabs>
  );
}
