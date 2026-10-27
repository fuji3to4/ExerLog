"use client";

import { useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  MeasurementInput,
  MeasurementNote,
  useMeasurementForm,
  type MeasurementFormProps,
} from "@/features/measurements/components/measurement-input";
import { readCircumferenceLimb, writeCircumferenceLimb, type Limb } from "@/features/measurements/circumference";
import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import { TimeField, TimelineDialogFooter } from "@/features/timeline/components/timeline-dialog-parts";
import type { MeasurementRecord } from "@/lib/types";
import { CircumferenceFields } from "./circumference-fields";
import { CircumferenceHelpDialog } from "./circumference-help-dialog";
import { circumferenceRepository } from "./data";

export type { MeasurementFormProps } from "@/features/measurements/components/measurement-input";

/** Editing opens on the limb the record has values for (arm first); otherwise the remembered limb. */
function initialLimb(record: MeasurementRecord | undefined): Limb {
  const limbs = CIRCUMFERENCE_ITEMS.filter((item) => record?.values[item.id] !== undefined).map(
    (item) => item.circumference?.limb,
  );
  if (limbs.includes("arm")) return "arm";
  if (limbs.includes("leg")) return "leg";
  return readCircumferenceLimb();
}

/**
 * Time, the arm|leg switch over the circumference grid, the measuring help and a note.
 * Drafts of the hidden limb are kept and still validated and saved.
 */
export function CircumferenceForm(props: MeasurementFormProps) {
  const { t } = useTranslation();
  const form = useMeasurementForm({ ...props, repository: circumferenceRepository, items: CIRCUMFERENCE_ITEMS });
  const [limb, setLimb] = useState<Limb>(() => initialLimb(props.record));
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const invalidLimbs = new Set<Limb>();
  for (const item of CIRCUMFERENCE_ITEMS) {
    if (item.circumference && form.parsed[item.id]?.state === "invalid") invalidLimbs.add(item.circumference.limb);
  }

  function chooseLimb(next: Limb) {
    setLimb(next);
    writeCircumferenceLimb(next);
  }

  return (
    <div className="space-y-4">
      <TimeField value={form.time} onChange={form.setTime} />
      <CircumferenceFields
        limb={limb}
        onLimbChange={chooseLimb}
        invalidLimbs={invalidLimbs}
        renderInput={(item) => (
          <MeasurementInput
            {...form.inputProps(item)}
            ariaLabel={t(item.labelKey)}
            // Compact so the "前回 150.0" placeholder fits a narrow grid cell; the value stays text-base (no iOS zoom).
            className="px-2 placeholder:text-sm"
          />
        )}
        onHelp={() => setIsHelpOpen(true)}
      />
      <CircumferenceHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} limb={limb} />
      <MeasurementNote value={form.note} onChange={form.setNote} />
      <TimelineDialogFooter {...form.footerProps} />
    </div>
  );
}
