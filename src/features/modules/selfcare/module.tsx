"use client";

import { HandHeart } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { SelfCareRecord } from "@/lib/types";
import { RangeSummaryView } from "../components/range-summary-view";
import { usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import type { RecordModule, TimeLabel } from "../types";
import { selfCareData } from "./data";
import { SelfCareForm } from "./selfcare-form";
import { loadSelfCareSummary, SelfCareSummaryBody, SelfCareSummaryCard } from "./summary-card";

const EMPTY = { summary: null };

function SelfCareTimelineCard({ record, label }: { record: SelfCareRecord; label: TimeLabel | null }) {
  const { t } = useTranslation();
  const itemLabel = t(`selfcare_item_${record.item}` as const);
  // "Other" has no fixed meaning, so its note is the content and goes on the same line.
  const inlineNote = record.item === "other" && record.note !== "";
  return (
    <>
      <span className="block">
        {inlineNote ? t("selfcare_other_inline", { item: itemLabel, note: record.note }) : itemLabel}
        {record.minutes !== null ? ` ${t("selfcare_minutes_value", { m: record.minutes })}` : null}
        <TimeLabelTag label={label} />
      </span>
      {record.note && !inlineNote ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}

function SelfCareRange({ period, dayCount }: { period: Period; dayCount: number | null }) {
  const loaded = usePeriodSummary(period, loadSelfCareSummary, EMPTY);
  if (loaded === undefined) return null;
  return (
    <div className="space-y-1 text-sm">
      <SelfCareSummaryBody summary={loaded.summary} dayCount={dayCount} />
    </div>
  );
}

function SelfCareHistoryView() {
  return <RangeSummaryView>{(period, dayCount) => <SelfCareRange period={period} dayCount={dayCount} />}</RangeSummaryView>;
}

export const selfCareModule: RecordModule<SelfCareRecord> = {
  data: selfCareData,
  labelKey: "module_selfcare_label",
  descriptionKey: "module_selfcare_description",
  editTitleKey: "selfcare_edit_title",
  icon: HandHeart,
  tags: ["lymphedema"],
  color: "#3a9e7e",
  Form: SelfCareForm,
  TimelineCard: SelfCareTimelineCard,
  HistoryView: SelfCareHistoryView,
  SummaryCard: SelfCareSummaryCard,
};
