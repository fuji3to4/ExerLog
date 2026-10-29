"use client";

import { Shrink } from "lucide-react";

import { MetricGraphView } from "@/features/history/components/metric-graph-view";
import { MeasurementTimelineCard } from "@/features/measurements/components/measurement-timeline-card";
import { GIRTH_ITEMS } from "@/features/measurements/measurement-items";
import type { MeasurementRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { girthData } from "./data";
import { GirthForm } from "./girth-form";
import { GIRTH_GRAPH_METRICS } from "./graph";
import { GirthSummaryCard } from "./summary-card";

function GirthTimelineCard({ record, label }: { record: MeasurementRecord; label: TimeLabel | null }) {
  return <MeasurementTimelineCard record={record} label={label} items={GIRTH_ITEMS} />;
}

function GirthHistoryView() {
  return <MetricGraphView metrics={GIRTH_GRAPH_METRICS} />;
}

export const girthModule: RecordModule<MeasurementRecord> = {
  data: girthData,
  labelKey: "module_girth_label",
  descriptionKey: "module_girth_description",
  editTitleKey: "girth_edit_title",
  icon: Shrink,
  color: "#8a6d1f",
  Form: GirthForm,
  TimelineCard: GirthTimelineCard,
  HistoryView: GirthHistoryView,
  SummaryCard: GirthSummaryCard,
};
