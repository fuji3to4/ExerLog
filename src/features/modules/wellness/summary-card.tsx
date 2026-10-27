"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import { wellnessData } from "./data";
import { summarizeWellness } from "./summary";

async function load(period: Period) {
  return { summary: summarizeWellness(await wellnessData.listInPeriod(period)) };
}

export function WellnessSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, load);
  const summary = loaded?.summary;

  return (
    <SummaryCardFrame title={t("module_wellness_label")}>
      {loaded === undefined ? null : !summary ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_count", { count: summary.count })}</p>
          {(["physical", "mental"] as const).map((kind) => (
            <p key={kind}>
              <span className="font-medium">{t(kind === "physical" ? "timeline_physical" : "timeline_mental")}</span>{" "}
              {t("period_average", { value: summary[kind].average.toFixed(1) })}
              {"・"}
              {t("period_min_max", { min: summary[kind].min, max: summary[kind].max })}
            </p>
          ))}
        </>
      )}
    </SummaryCardFrame>
  );
}
