"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SaveButton } from "@/features/feedback/save-button";
import { useSavedFlash } from "@/features/feedback/use-saved-flash";
import { useTranslation } from "@/features/i18n/use-translation";
import { MEASUREMENT_ITEMS, formatMeasurementValue } from "@/features/measurements/measurement-items";
import { calculateBmi } from "@/features/metrics/bmi";
import { findLatestHeightAt, getLatestMeasurementValues } from "@/features/storage/measurements.repository";
import { RecordDialog } from "@/features/timeline/components/record-dialog";
import { timeOfIso } from "@/lib/date/local-iso";

type RecordCardProps = {
  date: string;
};

type LatestValues = Record<string, { value: number; recordedAt: string }>;

type CardData = {
  latest: LatestValues;
  /** null: no weight or no height to compute from. */
  bmi: number | null;
  hasWeight: boolean;
};

/** "M/D HH:mm" from the digits of the stored local ISO string (no timezone conversion). */
function formatRecordedAt(recordedAt: string): string {
  return `${Number(recordedAt.slice(5, 7))}/${Number(recordedAt.slice(8, 10))} ${timeOfIso(recordedAt)}`;
}

async function loadCardData(): Promise<CardData> {
  const latest = await getLatestMeasurementValues();
  const weight = latest.weight;
  if (!weight) {
    return { latest, bmi: null, hasWeight: false };
  }
  const height = await findLatestHeightAt(weight.recordedAt);
  return { latest, bmi: height === null ? null : calculateBmi(weight.value, height), hasWeight: true };
}

export function RecordCard({ date }: RecordCardProps) {
  const { t } = useTranslation();
  const headingId = "self-care-record-heading";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [data, setData] = useState<CardData | null>(null);
  const { isSaved, flash } = useSavedFlash();

  const reload = useCallback(async () => {
    try {
      setData(await loadCardData());
    } catch {
      // Keep showing the previous values.
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <Card role="region" aria-labelledby={headingId} className="grid gap-4">
      <CardHeader className="gap-2">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("self_care_condition_heading")}
        </h2>
        <CardDescription>{t("self_care_wellness_text")}</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <SaveButton
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          isSaved={isSaved}
          onClick={() => setIsDialogOpen(true)}
        >
          {t("timeline_add_record")}
        </SaveButton>

        {data ? (
          <div className="grid gap-1 text-sm" aria-live="polite">
            <ul className="grid gap-1">
              {MEASUREMENT_ITEMS.map((item) => {
                const latest = data.latest[item.id];
                return (
                  <li key={item.id}>
                    {latest
                      ? `${t(item.labelKey)} ${formatMeasurementValue(item, latest.value)}${item.unit}（${formatRecordedAt(latest.recordedAt)}）`
                      : `${t(item.labelKey)} —`}
                  </li>
                );
              })}
            </ul>
            {data.hasWeight ? (
              <p className="text-muted-foreground">
                {data.bmi !== null ? t("bmi_value", { value: data.bmi.toFixed(1) }) : t("bmi_need_height")}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <RecordDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        date={date}
        onSaved={() => {
          flash();
          void reload();
        }}
      />
    </Card>
  );
}
