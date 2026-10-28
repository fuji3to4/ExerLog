"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import { periodDayCount, type Period } from "../period";
import { selfCareData } from "./data";
import { summarizeSelfCare, type SelfCareSummary } from "./summary";

const EMPTY = { summary: null };

export async function loadSelfCareSummary(period: Period) {
  return { summary: summarizeSelfCare(await selfCareData.listInPeriod(period)) };
}

/** One line per item; `dayCount` is null when the range is unbounded ("all"). */
export function SelfCareSummaryBody({ summary, dayCount }: { summary: SelfCareSummary | null; dayCount: number | null }) {
  const { t } = useTranslation();
  if (!summary) return <SummaryEmpty />;
  return (
    <>
      {summary.items.map(({ item, days, totalMinutes }) => (
        <p key={item}>
          <span className="font-medium">{t(`selfcare_item_${item}` as const)}</span>{" "}
          {dayCount === null ? t("period_days", { days }) : t("period_days_of", { days, total: dayCount })}
          {totalMinutes !== null ? `・${t("period_total_minutes", { m: totalMinutes })}` : null}
        </p>
      ))}
    </>
  );
}

export function SelfCareSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, loadSelfCareSummary, EMPTY);

  return (
    <SummaryCardFrame title={t("module_selfcare_label")}>
      {loaded === undefined ? null : <SelfCareSummaryBody summary={loaded.summary} dayCount={periodDayCount(period)} />}
    </SummaryCardFrame>
  );
}
