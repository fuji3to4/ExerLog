"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ModuleRecord, RecordModule } from "../types";

export type ModuleRecordDialogProps = {
  module: RecordModule;
  open: boolean;
  onOpenChange(open: boolean): void;
  date: string;
  /** The record to edit; absent when adding. It must belong to `module`. */
  record?: ModuleRecord;
  onSaved(id: string): void;
  onDeleted?(): void;
};

/** Dialog around one module's form, for adding a record or editing one. */
export function ModuleRecordDialog({
  module,
  open,
  onOpenChange,
  date,
  record,
  onSaved,
  onDeleted,
}: ModuleRecordDialogProps) {
  const { t } = useTranslation();
  const { Form } = module;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? t(module.editTitleKey) : t("record_add_module_title", { module: t(module.labelKey) })}</DialogTitle>
        </DialogHeader>
        {/* Content is mounted only while open, so the form state starts fresh on every open. */}
        <Form
          key={module.data.id}
          onOpenChange={onOpenChange}
          date={date}
          record={record}
          onSaved={(saved) => onSaved(saved.id)}
          onDeleted={onDeleted}
        />
      </DialogContent>
    </Dialog>
  );
}
