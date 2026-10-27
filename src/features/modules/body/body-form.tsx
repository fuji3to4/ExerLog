"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  MeasurementField,
  MeasurementNote,
  useMeasurementForm,
  type MeasurementFormProps,
} from "@/features/measurements/components/measurement-input";
import { BODY_ITEMS } from "@/features/measurements/measurement-items";
import { calculateBmi } from "@/features/metrics/bmi";
import { TimeField, TimelineDialogFooter } from "@/features/timeline/components/timeline-dialog-parts";
import { bodyRepository } from "./data";

export type { MeasurementFormProps } from "@/features/measurements/components/measurement-input";

/** Time, one number field per body item, the BMI line and a note. */
export function BodyForm(props: MeasurementFormProps) {
  const { t } = useTranslation();
  const form = useMeasurementForm({ ...props, repository: bodyRepository, items: BODY_ITEMS });
  const [fallbackHeight, setFallbackHeight] = useState<number | null>(null);
  const { recordedAt } = form;
  const editingId = props.record?.id;

  useEffect(() => {
    if (!recordedAt) return;
    let isCurrent = true;
    // The record being edited must not count as its own height.
    bodyRepository
      .findLatestValueAt("height", recordedAt, { excludeId: editingId })
      .then((height) => {
        if (isCurrent) setFallbackHeight(height);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      isCurrent = false;
    };
  }, [recordedAt, editingId]);

  const weight = form.parsed.weight;
  const enteredHeight = form.parsed.height;
  let bmiText: string | null = null;
  if (weight?.state === "ok") {
    const height = enteredHeight?.state === "ok" ? enteredHeight.value : fallbackHeight;
    const bmi = height === null ? null : calculateBmi(weight.value, height);
    bmiText = bmi === null ? t("bmi_need_height") : t("bmi_value", { value: bmi.toFixed(1) });
  }

  return (
    <div className="space-y-4">
      <TimeField value={form.time} onChange={form.setTime} />
      <div className="space-y-2">
        {BODY_ITEMS.map((item) => (
          <MeasurementField key={item.id} {...form.inputProps(item)} />
        ))}
      </div>
      {bmiText ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {bmiText}
        </p>
      ) : null}
      <MeasurementNote value={form.note} onChange={form.setNote} />
      <TimelineDialogFooter {...form.footerProps} />
    </div>
  );
}
