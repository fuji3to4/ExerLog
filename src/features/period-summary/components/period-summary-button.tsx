"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { PeriodSummaryDialog } from "./period-summary-dialog";

/** Opens the period summary dialog (for a clinic visit). */
export function PeriodSummaryButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("period_summary_button")}
      </Button>
      <PeriodSummaryDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
