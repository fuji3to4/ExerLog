"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { formatDelta } from "@/features/measurements/circumference";
import { GIRTH_ITEMS, formatMeasurementValue } from "@/features/measurements/measurement-items";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { FirstLast } from "../body/summary";
import type { Period } from "../period";
import { girthData } from "./data";
import { summarizeGirth } from "./summary";

const EMPTY = { summary: null };

async function load(period: Period) {
  return { summary: summarizeGirth(await girthData.listInPeriod(period)) };
}

function MetricLines({ itemId, stats }: { itemId: "chest" | "waist"; stats: FirstLast }) {
  const { t } = useTranslation();
  const item = GIRTH_ITEMS.find((candidate) => candidate.id === itemId)!;
  const show = (value: number) => `${formatMeasurementValue(item, value)}${item.unit}`;
  return (
    <div>
      <p>
        <span className="font-medium">{t(item.labelKey)}</span>
      </p>
      <p>
        {t("period_first_last", {
          first: show(stats.first),
          last: show(stats.last),
          diff: formatDelta(stats.diff, item.decimals),
        })}
      </p>
      <p className="text-muted-foreground">
        {t("period_min_max", { min: show(stats.min), max: show(stats.max) })}
      </p>
    </div>
  );
}

export function GirthSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, load, EMPTY);
  const summary = loaded?.summary;

  return (
    <SummaryCardFrame title={t("module_girth_label")}>
      {loaded === undefined ? null : !summary ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_count", { count: summary.count })}</p>
          {summary.chest ? <MetricLines itemId="chest" stats={summary.chest} /> : null}
          {summary.waist ? <MetricLines itemId="waist" stats={summary.waist} /> : null}
        </>
      )}
    </SummaryCardFrame>
  );
}
