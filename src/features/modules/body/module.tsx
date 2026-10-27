"use client";

import { Scale } from "lucide-react";

import { MeasurementTimelineCard } from "@/features/measurements/components/measurement-timeline-card";
import { BODY_ITEMS } from "@/features/measurements/measurement-items";
import type { MeasurementRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { BodyForm } from "./body-form";
import { bodyData } from "./data";

function BodyTimelineCard({ record, label }: { record: MeasurementRecord; label: TimeLabel | null }) {
  return <MeasurementTimelineCard record={record} label={label} items={BODY_ITEMS} />;
}

/** Filled in by the history task. */
function BodyHistoryView() {
  return null;
}

/** Filled in by the period summary task. */
function BodySummaryCard() {
  return null;
}

export const bodyModule: RecordModule<MeasurementRecord> = {
  data: bodyData,
  labelKey: "module_body_label",
  descriptionKey: "module_body_description",
  editTitleKey: "body_edit_title",
  icon: Scale,
  color: "#7a4fb0",
  Form: BodyForm,
  TimelineCard: BodyTimelineCard,
  HistoryView: BodyHistoryView,
  SummaryCard: BodySummaryCard,
};
