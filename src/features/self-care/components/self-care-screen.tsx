"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

import { MetricsCard } from "./metrics-card";
import { SelfCareLogCard } from "./self-care-log-card";
import { WellnessCard } from "./wellness-card";
import { useSelfCareData } from "../use-self-care-data";

type SelfCareScreenProps = {
  date?: string;
};

export function SelfCareScreen({ date: dateProp }: SelfCareScreenProps) {
  const date = dateProp ?? toDayKey(new Date());
  const { language, t, formatDate } = useTranslation();
  const {
    isHydrated,
    physicalScore,
    mentalScore,
    metrics,
    selfCareItems,
    selfCareEntries,
    setPhysicalScore,
    setMentalScore,
    setMetric,
    setSelfCareEntry,
    save,
  } = useSelfCareData(date);
  const copy =
    language === "ja"
      ? {
          loadingHeading: "セルフケアの記録を読み込み中...",
          loadingText: "この日に保存した体調、指標、セルフケア記録を確認しています。",
          saveButton: "セルフケアを保存",
        }
      : {
          loadingHeading: "Loading self care log...",
          loadingText: "Checking your saved wellness, metrics, and self care entries for this day.",
          saveButton: "Save self care",
        };

  return (
    <>
      <section className="card page-header">
        <p className="self-care-screen__date">{formatDate(date)}</p>
        <h1>{t("self_care_heading")}</h1>
        <p>{t("self_care_description")}</p>
      </section>

      {!isHydrated ? (
        <section className="card self-care-screen__section" aria-live="polite">
          <h2>{copy.loadingHeading}</h2>
          <p>{copy.loadingText}</p>
        </section>
      ) : (
        <>
          <WellnessCard
            physicalScore={physicalScore}
            mentalScore={mentalScore}
            onPhysicalScoreChange={setPhysicalScore}
            onMentalScoreChange={setMentalScore}
          />

          <MetricsCard metrics={metrics} onMetricChange={setMetric} />

          <SelfCareLogCard items={selfCareItems} entries={selfCareEntries} onEntryChange={setSelfCareEntry} />

          <section className="card self-care-screen__section">
            <div className="button-row">
              <button type="button" className="today-screen__primary-button" onClick={() => void save()}>
                {copy.saveButton}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
