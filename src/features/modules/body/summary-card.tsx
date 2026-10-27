"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { formatDelta } from "@/features/measurements/circumference";
import { BODY_ITEMS, formatMeasurementValue } from "@/features/measurements/measurement-items";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import { bodyData, bodyRepository } from "./data";
import { summarizeBody, type FirstLast } from "./summary";

async function load(period: Period) {
  const records = await bodyData.listInPeriod(period);
  const lastWeight = records.filter((record) => "weight" in record.values).at(-1);
  const height = lastWeight ? await bodyRepository.findLatestValueAt("height", lastWeight.recordedAt) : null;
  return { summary: summarizeBody(records, height) };
}

function MetricLines({ itemId, stats }: { itemId: "weight" | "bodyFat"; stats: FirstLast }) {
  const { t } = useTranslation();
  const item = BODY_ITEMS.find((candidate) => candidate.id === itemId)!;
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

export function BodySummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, load);
  const summary = loaded?.summary;

  return (
    <SummaryCardFrame title={t("module_body_label")}>
      {loaded === undefined ? null : !summary ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_count", { count: summary.count })}</p>
          {summary.weight ? <MetricLines itemId="weight" stats={summary.weight} /> : null}
          {summary.bodyFat ? <MetricLines itemId="bodyFat" stats={summary.bodyFat} /> : null}
          {summary.bmi !== null ? <p>{t("bmi_value", { value: summary.bmi.toFixed(1) })}</p> : null}
        </>
      )}
    </SummaryCardFrame>
  );
}
