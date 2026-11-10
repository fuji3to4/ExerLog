"use client";

import { useMemo } from "react";

import { MetricGraphView, sortByTime, type GraphMetric } from "@/features/history/components/metric-graph-view";
import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { CustomRecord, CustomRecordType } from "@/lib/types";
import { RangeSummaryView } from "../components/range-summary-view";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import type { RecordFormProps, RecordModule, TimeLabel } from "../types";
import { CustomRecordForm } from "./custom-form";
import { createCustomModuleData, listCustomInRange } from "./data";
import { resolveText, type CustomRecordDefinition } from "./definition";
import { summarizeCustomRecords, type CustomSummary } from "./summary";
import { formatRecordLine } from "./values";

/** Decimal places implied by a step such as 0.1; 1 when there is none. */
function decimalsOf(step: number | undefined): number {
  if (step === undefined) return 1;
  const text = String(step);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

function graphMetrics(definition: CustomRecordDefinition, language: string): GraphMetric[] {
  const metrics: GraphMetric[] = [];
  for (const field of definition.fields) {
    if (field.type !== "number" && field.type !== "scale") continue;
    metrics.push({
      key: field.id,
      label: resolveText(field.label, language),
      async load(range) {
        const records = await listCustomInRange(definition.id, range.start, range.end);
        const points = records.flatMap((r) => {
          const value = r.values[field.id];
          return typeof value === "number" ? [{ at: r.recordedAt, value }] : [];
        });
        return {
          unit: field.type === "number" ? (field.unit ?? "") : "",
          decimals: field.type === "number" ? decimalsOf(field.step) : 0,
          points: sortByTime(points),
        };
      },
    });
  }
  return metrics;
}

/** "M/D HH:mm" in the record's own local time. */
function formatDateTime(recordedAt: string): string {
  const month = Number(recordedAt.slice(5, 7));
  const day = Number(recordedAt.slice(8, 10));
  return `${month}/${day} ${recordedAt.slice(11, 16)}`;
}

function round(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function SummaryBody({ definition, summary }: { definition: CustomRecordDefinition; summary: CustomSummary | null }) {
  const { t, language } = useTranslation();
  if (!summary) return <SummaryEmpty />;
  const labelOf = (fieldId: string) => {
    const field = definition.fields.find((f) => f.id === fieldId);
    return field ? resolveText(field.label, language) : fieldId;
  };
  return (
    <>
      <p>{t("custom_summary_count", { count: summary.count })}</p>
      {summary.numeric.map((item) => (
        <p key={item.fieldId}>
          <span className="font-medium">{labelOf(item.fieldId)}</span>{" "}
          {t("custom_summary_numeric", { avg: round(item.avg), min: round(item.min), max: round(item.max) })}
        </p>
      ))}
      {summary.choices.map((item) => {
        const field = definition.fields.find((f) => f.id === item.fieldId);
        const options = field && (field.type === "choice" || field.type === "multiChoice") ? field.options : [];
        return (
          <p key={item.fieldId}>
            <span className="font-medium">{labelOf(item.fieldId)}</span>{" "}
            {item.counts
              .map((c) => {
                const option = options.find((o) => o.id === c.optionId);
                return `${option ? resolveText(option.label, language) : c.optionId} ${c.count}`;
              })
              .join(t("sep_dot"))}
          </p>
        );
      })}
    </>
  );
}

const NO_RECORDS: CustomRecord[] = [];
const NO_SUMMARY = { summary: null as CustomSummary | null };

/** Builds the screens of one imported record type. */
export function createCustomModule(type: CustomRecordType): RecordModule<CustomRecord> {
  const definition = type.definition;
  const data = createCustomModuleData(type);

  const loadSummary = async (period: Period) => ({
    summary: summarizeCustomRecords(definition, await data.listInPeriod(period)),
  });
  // Newest first.
  const loadList = async (period: Period) => (await data.listInPeriod(period)).slice().reverse();

  function Form(props: RecordFormProps<CustomRecord>) {
    return <CustomRecordForm definition={definition} {...props} />;
  }

  function TimelineCard({ record, label }: { record: CustomRecord; label: TimeLabel | null }) {
    const { t, language } = useTranslation();
    return (
      <>
        <span className="block">
          {formatRecordLine(definition, record, language, t("sep_dot"))}
          <TimeLabelTag label={label} />
        </span>
        {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
      </>
    );
  }

  function RecordList({ period }: { period: Period }) {
    const { t, language } = useTranslation();
    const records = usePeriodSummary(period, loadList, NO_RECORDS);
    if (records === undefined) return null;
    if (records.length === 0) return <SummaryEmpty />;
    return (
      <ul className="space-y-1 text-sm">
        {records.map((record) => (
          <li key={record.id}>
            <span className="text-muted-foreground">{formatDateTime(record.recordedAt)}</span>{" "}
            {formatRecordLine(definition, record, language, t("sep_dot"))}
          </li>
        ))}
      </ul>
    );
  }

  function HistoryView() {
    const { language } = useTranslation();
    const metrics = useMemo(() => graphMetrics(definition, language), [language]);
    return (
      <div className="space-y-4">
        {metrics.length > 0 ? <MetricGraphView metrics={metrics} /> : null}
        <RangeSummaryView>{(period) => <RecordList period={period} />}</RangeSummaryView>
      </div>
    );
  }

  function SummaryCard({ period }: { period: Period }) {
    const { language } = useTranslation();
    const loaded = usePeriodSummary(period, loadSummary, NO_SUMMARY);
    return (
      <SummaryCardFrame title={resolveText(definition.name, language)}>
        {loaded === undefined ? null : <SummaryBody definition={definition} summary={loaded.summary} />}
      </SummaryCardFrame>
    );
  }

  return {
    data,
    naming: { kind: "text", label: definition.name, description: definition.description, emoji: definition.icon },
    isCustom: true,
    hidden: type.deleted,
    color: definition.color,
    Form,
    TimelineCard,
    HistoryView,
    SummaryCard,
  };
}
