"use client";

import Link from "next/link";

import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

import { DailyConditionCard } from "./daily-condition-card";
import { RecommendedExerciseCard } from "./recommended-exercise-card";
import { useTodayData } from "../use-today-data";

type TodayScreenProps = {
  date?: string;
};

export function TodayScreen({ date: dateProp }: TodayScreenProps) {
  const date = dateProp ?? toDayKey(new Date());
  const { t, formatDate } = useTranslation();
  const {
    isHydrated,
    physicalScore,
    mentalScore,
    note,
    recommendations,
    logResults,
    setPhysicalScore,
    setMentalScore,
    setNote,
    saveCondition,
    logExercise,
  } = useTodayData(date);

  return (
    <>
      <section className="card page-header">
        <p className="today-screen__date">{formatDate(date)}</p>
        <h1>{t("today_heading")}</h1>
        <p>{t("today_subheading")}</p>
      </section>

      {!isHydrated ? (
        <section className="card today-screen__section" aria-live="polite">
          <h2>{t("today_loading_heading")}</h2>
          <p>{t("today_loading_text")}</p>
        </section>
      ) : (
        <>
      <DailyConditionCard
        physicalScore={physicalScore}
        mentalScore={mentalScore}
        note={note}
        onPhysicalScoreChange={setPhysicalScore}
        onMentalScoreChange={setMentalScore}
        onNoteChange={setNote}
        onSave={saveCondition}
      />

      <section className="today-screen__section">
        <div className="card today-screen__section-heading">
          <h2>{t("today_recommended_heading")}</h2>
          <p>{t("today_recommended_text")}</p>
        </div>
        <div className="today-screen__recommendations">
          {recommendations.map((exercise) => (
            <RecommendedExerciseCard
              key={exercise.id}
              exercise={exercise}
              result={logResults[exercise.id] ?? null}
              watchHref={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
              onLog={(result) => void logExercise(exercise.id, result)}
            />
          ))}
        </div>
      </section>

      <section className="card today-screen__library-card">
        <h2>{t("today_library_card_heading")}</h2>
        <p>{t("today_library_card_text")}</p>
        <div className="button-row">
          <Link href="/library" className="button-secondary">
            {t("today_library_button")}
          </Link>
        </div>
      </section>
        </>
      )}
    </>
  );
}
