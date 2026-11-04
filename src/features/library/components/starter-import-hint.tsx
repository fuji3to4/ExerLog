"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { importStarterExercises } from "@/features/storage/exercise-catalog.repository";

type StarterImportHintProps = {
  /** Called after the starter exercises are stored, so the screen can reload them. */
  onImported: () => void | Promise<void>;
};

/** Shown only while the library is empty; disappears once anything is in it. */
export function StarterImportHint({ onImported }: StarterImportHintProps) {
  const { t } = useTranslation();
  const [isImporting, setIsImporting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function handleImport() {
    setIsImporting(true);
    setHasFailed(false);
    try {
      await importStarterExercises();
      await onImported();
    } catch (error) {
      console.error(error);
      setHasFailed(true);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">{t("starter_hint_text")}</p>
      <div className="button-row">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isImporting}
          onClick={() => void handleImport()}
        >
          {t("settings_import_starter")}
        </Button>
      </div>
      {hasFailed ? (
        <p role="alert" className="text-sm text-destructive">
          {t("settings_import_error", { error: t("settings_import_save_failed") })}
        </p>
      ) : null}
    </div>
  );
}
