"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";

const STEPS = ["custom_help_step_1", "custom_help_step_2", "custom_help_step_3"] as const;
const NOTES = ["custom_help_note_types", "custom_help_note_templates", "custom_help_note_share"] as const;

/** Short how-to for adding a record type from an AI-written definition. */
export function CustomTypesHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("custom_help_title")}</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {STEPS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {NOTES.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
