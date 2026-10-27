"use client";

import { Ruler } from "lucide-react";

import { MeasurementTimelineCard } from "@/features/measurements/components/measurement-timeline-card";
import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import type { MeasurementRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { CircumferenceForm } from "./circumference-form";
import { circumferenceData } from "./data";

function CircumferenceTimelineCard({ record, label }: { record: MeasurementRecord; label: TimeLabel | null }) {
  return <MeasurementTimelineCard record={record} label={label} items={CIRCUMFERENCE_ITEMS} />;
}

/** Filled in by the history task. */
function CircumferenceHistoryView() {
  return null;
}

/** Filled in by the period summary task. */
function CircumferenceSummaryCard() {
  return null;
}

export const circumferenceModule: RecordModule<MeasurementRecord> = {
  data: circumferenceData,
  labelKey: "module_circumference_label",
  descriptionKey: "module_circumference_description",
  editTitleKey: "circumference_edit_title",
  icon: Ruler,
  color: "#c25b8c",
  Form: CircumferenceForm,
  TimelineCard: CircumferenceTimelineCard,
  HistoryView: CircumferenceHistoryView,
  SummaryCard: CircumferenceSummaryCard,
};
