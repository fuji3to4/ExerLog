"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import { periodDayCount, type Period } from "../period";
import { compressionData } from "./data";
import { formatWearMinutes, summarizeCompression, type CompressionSummary } from "./summary";

const EMPTY = { summary: null };

export async function loadCompressionSummary(period: Period) {
  return { summary: summarizeCompression(await compressionData.listInPeriod(period)) };
}

/** One line per kind; `dayCount` is null when the range is unbounded ("all"). */
export function CompressionSummaryBody({
  summary,
  dayCount,
}: {
  summary: CompressionSummary | null;
  dayCount: number | null;
}) {
  const { t, language } = useTranslation();
  if (!summary) return <SummaryEmpty />;
  return (
    <>
      {summary.kinds.map(({ kind, days, averageMinutes }) => (
        <p key={kind}>
          <span className="font-medium">{t(`compression_kind_${kind}` as const)}</span>{" "}
          {dayCount === null ? t("period_days", { days }) : t("period_days_of", { days, total: dayCount })}
          {averageMinutes !== null
            ? `・${t("period_average_wear", { duration: formatWearMinutes(averageMinutes, language) })}`
            : null}
        </p>
      ))}
    </>
  );
}

export function CompressionSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, loadCompressionSummary, EMPTY);

  return (
    <SummaryCardFrame title={t("module_compression_label")}>
      {loaded === undefined ? null : <CompressionSummaryBody summary={loaded.summary} dayCount={periodDayCount(period)} />}
    </SummaryCardFrame>
  );
}
