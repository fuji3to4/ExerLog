"use client";

import { Shirt } from "lucide-react";

import { MetricGraphView } from "@/features/history/components/metric-graph-view";
import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { CompressionRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { CompressionForm } from "./compression-form";
import { compressionData } from "./data";
import { clockOf, endLabel, startLabel } from "./format";
import { COMPRESSION_GRAPH_METRICS } from "./graph";
import { CompressionSummaryCard } from "./summary-card";
import { formatWearMinutes, wearMinutes } from "./summary";

function CompressionTimelineCard({ record, label }: { record: CompressionRecord; label: TimeLabel | null }) {
  const { t, language } = useTranslation();
  const kind = t(`compression_kind_${record.kind}` as const);
  const minutes = wearMinutes(record);
  let line: string;
  if (record.endedAt === null) {
    line = `${kind} ${t("compression_since", { start: startLabel(record) })} ${t("compression_wearing")}`;
  } else {
    // Start is shown as a clock time only; the date is added to the end when it falls on another day.
    const range = t("compression_range", {
      start: clockOf(record.recordedAt),
      end: endLabel({ recordedAt: record.recordedAt, endedAt: record.endedAt }),
    });
    const span = `${kind} ${range}`;
    if (minutes === null) line = span;
    else {
      line = t("compression_span_duration", { span, duration: formatWearMinutes(minutes, language) });
    }
  }
  return (
    <>
      <span className="block">
        {line}
        <TimeLabelTag label={label} />
      </span>
      {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}

function CompressionHistoryView() {
  return <MetricGraphView metrics={COMPRESSION_GRAPH_METRICS} />;
}

export const compressionModule: RecordModule<CompressionRecord> = {
  data: compressionData,
  labelKey: "module_compression_label",
  descriptionKey: "module_compression_description",
  editTitleKey: "compression_edit_title",
  icon: Shirt,
  color: "#5b7fd6",
  Form: CompressionForm,
  TimelineCard: CompressionTimelineCard,
  HistoryView: CompressionHistoryView,
  SummaryCard: CompressionSummaryCard,
};
