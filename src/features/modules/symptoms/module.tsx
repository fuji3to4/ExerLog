"use client";

import { Activity } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { SymptomEntry, SymptomRecord } from "@/lib/types";
import { RangeSummaryView } from "../components/range-summary-view";
import { usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import type { RecordModule, TimeLabel } from "../types";
import { symptomsData } from "./data";
import { EMPTY_SYMPTOMS, loadSymptomsSummary, SymptomsSummaryBody, SymptomsSummaryCard } from "./summary-card";
import { SymptomsForm } from "./symptoms-form";

type Translate = ReturnType<typeof useTranslation>["t"];

/** "Swelling（Moderate・Left arm）": severity or care first, then sites; no brackets when there is neither. */
export function formatSymptomEntry(entry: SymptomEntry, t: Translate): string {
  const parts: string[] = [];
  if (entry.severity !== null) parts.push(t(`symptom_severity_${entry.severity}` as const));
  if (entry.care !== null) parts.push(t(`cellulitis_care_${entry.care}` as const));
  for (const site of entry.sites) parts.push(t(`body_site_${site}` as const));
  const name = t(`symptom_${entry.id}` as const);
  return parts.length > 0 ? `${name}（${parts.join("・")}）` : name;
}

function SymptomsTimelineCard({ record, label }: { record: SymptomRecord; label: TimeLabel | null }) {
  const { t } = useTranslation();
  const line =
    record.symptoms.length === 0
      ? t("symptoms_none")
      : record.symptoms.map((entry) => formatSymptomEntry(entry, t)).join("、");
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

/** One row per cellulitis entry, newest first: "10/5 通院・右脚". Renders nothing when there are none. */
function CellulitisList({ records }: { records: SymptomRecord[] }) {
  const { t } = useTranslation();
  const rows = records
    .flatMap((record) => record.symptoms.filter((e) => e.id === "cellulitis").map((entry) => ({ record, entry })))
    .sort((a, b) => b.record.recordedAt.localeCompare(a.record.recordedAt));
  if (rows.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="font-semibold">{t("symptom_cellulitis")}</h3>
      <ul className="space-y-0.5">
        {rows.map(({ record, entry }) => {
          const [, month, day] = record.date.split("-").map(Number);
          const details = [
            ...(entry.care !== null ? [t(`cellulitis_care_${entry.care}` as const)] : []),
            ...entry.sites.map((site) => t(`body_site_${site}` as const)),
          ].join("・");
          return <li key={record.id}>{details ? `${month}/${day} ${details}` : `${month}/${day}`}</li>;
        })}
      </ul>
    </section>
  );
}

function SymptomsRange({ period }: { period: Period }) {
  const loaded = usePeriodSummary(period, loadSymptomsSummary, EMPTY_SYMPTOMS);
  if (loaded === undefined) return null;
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <SymptomsSummaryBody summary={loaded.summary} />
      </div>
      <CellulitisList records={loaded.records} />
    </div>
  );
}

function SymptomsHistoryView() {
  return <RangeSummaryView>{(period) => <SymptomsRange period={period} />}</RangeSummaryView>;
}

export const symptomsModule: RecordModule<SymptomRecord> = {
  data: symptomsData,
  labelKey: "module_symptoms_label",
  descriptionKey: "module_symptoms_description",
  editTitleKey: "symptoms_edit_title",
  icon: Activity,
  color: "#c2577a",
  Form: SymptomsForm,
  TimelineCard: SymptomsTimelineCard,
  HistoryView: SymptomsHistoryView,
  SummaryCard: SymptomsSummaryCard,
};
