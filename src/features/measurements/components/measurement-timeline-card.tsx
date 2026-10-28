"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { WellnessLabel } from "@/features/timeline/build-timeline";
import type { MeasurementRecord } from "@/lib/types";
import { formatMeasurementSummary, type MeasurementItem } from "../measurement-items";

/** Timeline row body of a measurement record: the summary of `items`, the label and the note. */
export function MeasurementTimelineCard({
  record,
  label,
  items,
}: {
  record: MeasurementRecord;
  label: WellnessLabel | null;
  items: readonly MeasurementItem[];
}) {
  const { t } = useTranslation();
  return (
    <>
      <span className="block">
        {t("timeline_measurement_row", { summary: formatMeasurementSummary(record, items, t) || "—" })}
        <TimeLabelTag label={label} />
      </span>
      {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}
