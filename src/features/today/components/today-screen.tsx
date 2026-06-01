"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";
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
  const recommendedHeadingId = "today-recommended-heading";
  const libraryHeadingId = "today-library-heading";
  const {
    isHydrated,
    physicalScore,
    mentalScore,
    note,
    recommendations,
    logResults,
    conditionSaveError,
    setPhysicalScore,
    setMentalScore,
    setNote,
    saveCondition,
    logExercise,
    clearExercise,
  } = useTodayData(date);

  return (
    <>
      <Card className="page-header">
        <CardHeader className="gap-2">
          <p className="today-screen__date text-sm text-muted-foreground">{formatDate(date)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("today_heading")}</h1>
          <CardDescription>{t("today_subheading")}</CardDescription>
        </CardHeader>
      </Card>

      {!isHydrated ? (
        <Card className="grid gap-4" aria-live="polite">
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("today_loading_heading")}</h2>
            <CardDescription>{t("today_loading_text")}</CardDescription>
          </CardHeader>
        </Card>
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
            saveError={conditionSaveError ? t("condition_save_error") : undefined}
          />

          <Card
            role="region"
            aria-labelledby={recommendedHeadingId}
            className="grid gap-4"
          >
            <CardHeader className="gap-2">
              <h2 id={recommendedHeadingId} className="text-xl font-semibold">
                {t("today_recommended_heading")}
              </h2>
              <CardDescription>{t("today_recommended_text")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="today-screen__recommendations">
                {recommendations.map((exercise) => (
                  <RecommendedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    result={logResults[exercise.id] ?? null}
                    watchHref={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
                    onLog={(result) => void logExercise(exercise.id, result)}
                    onClear={() => void clearExercise(exercise.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card role="region" aria-labelledby={libraryHeadingId} className="today-screen__library-card">
            <CardHeader>
              <h2 id={libraryHeadingId} className="text-xl font-semibold">
                {t("today_library_card_heading")}
              </h2>
              <CardDescription>{t("today_library_card_text")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="button-row">
                <Link
                  href="/library"
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
                >
                  {t("today_library_button")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
