"use client";

import { useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MeasurementRecord, WellnessEntry } from "@/lib/types";
import { BodyForm } from "@/features/modules/body/body-form";
import { CircumferenceForm } from "@/features/modules/circumference/circumference-form";
import { SegmentedTabs } from "./segmented-tabs";
import { WellnessForm } from "./wellness-entry-dialog";

export type RecordKind = "wellness" | "body" | "circumference";

/** Remembers which kind a new record opens on. */
export const RECORD_KIND_STORAGE_KEY = "exerlog-record-kind";

const RECORD_KINDS: readonly RecordKind[] = ["wellness", "body", "circumference"];

const KIND_LABEL_KEYS = {
  wellness: "record_kind_wellness",
  body: "record_kind_body",
  circumference: "record_kind_circumference",
} as const satisfies Record<RecordKind, string>;

export type RecordDialogEditing =
  | { kind: "wellness"; entry: WellnessEntry }
  | { kind: "body" | "circumference"; record: MeasurementRecord };

export type RecordDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  date: string;
  editing?: RecordDialogEditing;
  onSaved(id: string): void;
  onDeleted?(): void;
};

/** The remembered kind; an unknown value (e.g. the old "measurement") opens on wellness. */
function readRecordKind(): RecordKind {
  try {
    const stored = window.localStorage.getItem(RECORD_KIND_STORAGE_KEY);
    return RECORD_KINDS.find((kind) => kind === stored) ?? "wellness";
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

/** One dialog for adding or editing a wellness entry, a body record or a circumference record. */
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
      : editing.kind === "body"
        ? t("body_edit_title")
        : t("circumference_edit_title");

  const measurementProps = {
    onOpenChange,
    date,
    record: editing && editing.kind !== "wellness" ? editing.record : undefined,
    onSaved: (record: MeasurementRecord) => onSaved(record.id),
    onDeleted,
  };
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
    ) : kind === "body" ? (
      <BodyForm key="body" {...measurementProps} />
    ) : (
      <CircumferenceForm key="circumference" {...measurementProps} />
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
      renderTab={(kind) => t(KIND_LABEL_KEYS[kind])}
    >
      {children}
    </SegmentedTabs>
  );
}
