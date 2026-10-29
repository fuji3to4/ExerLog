"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  MeasurementField,
  MeasurementNote,
  useMeasurementForm,
  type MeasurementFormProps,
} from "@/features/measurements/components/measurement-input";
import { GIRTH_ITEMS } from "@/features/measurements/measurement-items";
import { TimeField, TimelineDialogFooter } from "@/features/timeline/components/timeline-dialog-parts";
import { girthRepository } from "./data";

/** Time, one number field per girth item and a note. */
export function GirthForm(props: MeasurementFormProps) {
  const form = useMeasurementForm({ ...props, repository: girthRepository, items: GIRTH_ITEMS });

  return (
    <div className="space-y-4">
      <TimeField value={form.time} onChange={form.setTime} />
      <div className="space-y-2">
        {GIRTH_ITEMS.map((item) => (
          <MeasurementField key={item.id} {...form.inputProps(item)} />
        ))}
      </div>
      <MeasurementNote value={form.note} onChange={form.setNote} />
      <TimelineDialogFooter {...form.footerProps} />
    </div>
  );
}
