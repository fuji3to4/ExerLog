"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { SymptomRecord } from "@/lib/types";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import { symptomsData } from "./data";
import { summarizeSymptoms, type SymptomsSummary } from "./summary";

export type SymptomsPeriodData = { summary: SymptomsSummary | null; records: SymptomRecord[] };

export const EMPTY_SYMPTOMS: SymptomsPeriodData = { summary: null, records: [] };

export async function loadSymptomsSummary(period: Period): Promise<SymptomsPeriodData> {
  const records = await symptomsData.listInPeriod(period);
  return { summary: summarizeSymptoms(records), records };
}

const CARES = ["inpatient", "outpatient", "none"] as const;

/** First line is the recorded days, then one line per symptom and one for cellulitis. */
export function SymptomsSummaryBody({ summary }: { summary: SymptomsSummary | null }) {
  const { t } = useTranslation();
  if (!summary) return <SummaryEmpty />;
  const cellulitis = summary.cellulitis;
  const careParts = cellulitis
    ? CARES.filter((care) => cellulitis.careDays[care] > 0).map(
        (care) => `${t(`cellulitis_care_${care}` as const)} ${t("period_days", { days: cellulitis.careDays[care] })}`,
      )
    : [];
  return (
    <>
      <p>{t("period_recorded_days", { days: summary.recordedDays, none: summary.noSymptomDays })}</p>
      {summary.symptoms
        .filter((s) => s.id !== "cellulitis")
        .map(({ id, days, maxSeverity, sites }) => (
          <p key={id}>
            <span className="font-medium">{t(`symptom_${id}` as const)}</span> {t("period_days", { days })}
            {maxSeverity !== null
              ? `・${t("period_max_severity", { severity: t(`symptom_severity_${maxSeverity}` as const) })}`
              : null}
            {sites.map((site) => `・${t(`body_site_${site}` as const)}`).join("")}
          </p>
        ))}
      {cellulitis ? (
        <p>
          <span className="font-medium">{t("symptom_cellulitis")}</span> {t("period_days", { days: cellulitis.days })}
          {careParts.length > 0 ? `（${careParts.join("・")}）` : null}
        </p>
      ) : null}
    </>
  );
}

export function SymptomsSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, loadSymptomsSummary, EMPTY_SYMPTOMS);

  return (
    <SummaryCardFrame title={t("module_symptoms_label")}>
      {loaded === undefined ? null : <SymptomsSummaryBody summary={loaded.summary} />}
    </SummaryCardFrame>
  );
}
