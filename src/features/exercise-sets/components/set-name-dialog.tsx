"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";

export type SetNameDialogProps = {
  open: boolean;
  title: string;
  initialName: string;
  onSubmit(name: string): Promise<void> | void;
  onOpenChange(open: boolean): void;
};

/** Centered dialog asking for a set name; used both to create a set and to rename one. */
export function SetNameDialog({ open, title, initialName, onSubmit, onOpenChange }: SetNameDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  // Start from the current name every time the dialog opens.
  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const trimmed = name.trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <form className="set-name-dialog" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <label className="set-name-dialog__field">
            <span>{t("set_name_label")}</span>
            <input
              type="text"
              value={name}
              placeholder={t("set_name_placeholder")}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
          <DialogFooter>
            <button
              type="button"
              className="settings-action-button settings-action-button--secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("settings_form_cancel")}
            </button>
            <button type="submit" className="settings-action-button" disabled={!trimmed || isSaving}>
              {t("settings_form_save")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
