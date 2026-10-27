"use client";

import { Ruler } from "lucide-react";
import { useMemo, useState } from "react";

import { getDateRangeForPreset, RangePresetButtons, type DateRangePreset } from "@/features/history/range-presets";
import { MeasurementTimelineCard } from "@/features/measurements/components/measurement-timeline-card";
import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import type { MeasurementRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { CircumferenceGraph } from "./circumference-graph";
import { CircumferenceForm } from "./circumference-form";
import { circumferenceData } from "./data";
import { CircumferenceSummaryCard } from "./summary-card";

function CircumferenceTimelineCard({ record, label }: { record: MeasurementRecord; label: TimeLabel | null }) {
  return <MeasurementTimelineCard record={record} label={label} items={CIRCUMFERENCE_ITEMS} />;
}

function CircumferenceHistoryView() {
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const range = useMemo(() => getDateRangeForPreset(preset), [preset]);
  return (
    <div className="space-y-4">
      <RangePresetButtons value={preset} onChange={setPreset} />
      <CircumferenceGraph range={range} />
    </div>
  );
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
