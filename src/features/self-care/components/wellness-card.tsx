"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SaveButton } from "@/features/feedback/save-button";
import { useSavedFlash } from "@/features/feedback/use-saved-flash";
import { useTranslation } from "@/features/i18n/use-translation";
import { WellnessEntryDialog } from "@/features/timeline/components/wellness-entry-dialog";

type WellnessCardProps = {
  date: string;
};

export function WellnessCard({ date }: WellnessCardProps) {
  const { t } = useTranslation();
  const headingId = "self-care-wellness-heading";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isSaved, flash } = useSavedFlash();

  return (
    <Card role="region" aria-labelledby={headingId} className="grid gap-4">
      <CardHeader className="gap-2">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("self_care_condition_heading")}
        </h2>
        <CardDescription>{t("self_care_wellness_text")}</CardDescription>
      </CardHeader>

      <CardContent>
        <SaveButton
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          isSaved={isSaved}
          onClick={() => setIsDialogOpen(true)}
        >
          {t("timeline_add_wellness")}
        </SaveButton>
      </CardContent>

      <WellnessEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        date={date}
        onSaved={flash}
      />
    </Card>
  );
}
