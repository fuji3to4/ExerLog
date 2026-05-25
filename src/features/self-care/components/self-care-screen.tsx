"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

import { MetricsCard } from "./metrics-card";
import { WellnessCard } from "./wellness-card";
import { useSelfCareData } from "../use-self-care-data";

type SelfCareScreenProps = {
  date?: string;
};

export function SelfCareScreen({ date: dateProp }: SelfCareScreenProps) {
  const date = dateProp ?? toDayKey(new Date());
  const { t, formatDate } = useTranslation();
  const {
    isHydrated,
    physicalScore,
    mentalScore,
    note,
    metrics,
    setPhysicalScore,
    setMentalScore,
    setNote,
    setMetric,
    save,
  } = useSelfCareData(date);
  return (
    <>
      <section className="card page-header">
        <p className="self-care-screen__date">{formatDate(date)}</p>
        <h1>{t("self_care_heading")}</h1>
        <p>{t("self_care_description")}</p>
      </section>

      {!isHydrated ? (
        <section className="card self-care-screen__section" aria-live="polite">
          <h2>{t("today_loading_heading")}</h2>
          <p>{t("today_loading_text")}</p>
        </section>
      ) : (
        <>
          <WellnessCard
            physicalScore={physicalScore}
            mentalScore={mentalScore}
            note={note}
            onPhysicalScoreChange={setPhysicalScore}
            onMentalScoreChange={setMentalScore}
            onNoteChange={setNote}
          />

          <MetricsCard metrics={metrics} onMetricChange={setMetric} />

          <section className="card self-care-screen__section">
            <div className="button-row">
              <button type="button" className="today-screen__primary-button" onClick={() => void save()}>
                {t("condition_save_button")}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
