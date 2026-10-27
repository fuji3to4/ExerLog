"use client";

import { Smile } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { WellnessEntry } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { wellnessData } from "./data";
import { WellnessForm } from "./wellness-entry-dialog";

function WellnessTimelineCard({ record, label }: { record: WellnessEntry; label: TimeLabel | null }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="block">
        {t("timeline_wellness_row", { physical: record.physicalScore, mental: record.mentalScore })}
        <TimeLabelTag label={label} />
      </span>
      {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}

/** Filled in by the history task. */
function WellnessHistoryView() {
  return null;
}

/** Filled in by the period summary task. */
function WellnessSummaryCard() {
  return null;
}

export const wellnessModule: RecordModule<WellnessEntry> = {
  data: wellnessData,
  labelKey: "module_wellness_label",
  descriptionKey: "module_wellness_description",
  editTitleKey: "timeline_wellness_edit_title",
  icon: Smile,
  color: "#e48a3a",
  Form: WellnessForm,
  TimelineCard: WellnessTimelineCard,
  HistoryView: WellnessHistoryView,
  SummaryCard: WellnessSummaryCard,
};
