"use client";

import Link from "next/link";
import { useState } from "react";
import { RotateCw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { SetSwitcher } from "@/features/exercise-sets/components/set-switcher";
import { useCelebrate } from "@/features/feedback/celebration";
import { useModuleSettings } from "@/features/modules/use-module-settings";
import { TimelineSection } from "@/features/timeline/components/timeline-section";
import { useDayTimeline } from "@/features/timeline/use-day-timeline";
import { cn } from "@/lib/utils";
import { toDayKey } from "@/lib/date/day-key";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";

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
    recommendations,
    logCounts,
    logExercise,
    refresh,
    reshuffleRecommendations,
    sets,
    selectedSet,
    selectedSetExercises,
    selectSet,
    reloadSets,
  } = useTodayData(date);
  const { enabledModules } = useModuleSettings();
  const timeline = useDayTimeline(date, enabledModules);
  const celebrate = useCelebrate();
  const [logErrorExerciseId, setLogErrorExerciseId] = useState<string | null>(null);

  const cards = selectedSet
    ? selectedSetExercises.map((exercise) => ({ exercise, slot: undefined }))
    : recommendations;

  async function handleLog(exercise: ExerciseVideo, result: ExerciseLogResult) {
    setLogErrorExerciseId(null);
    try {
      const log = await logExercise(exercise, result);
      celebrate({ result, durationSeconds: log.durationSeconds });
      await timeline.reload(log.id);
    } catch (error) {
      console.error(error);
      setLogErrorExerciseId(exercise.id);
    }
  }

  return (
    <>
      <Card className="page-header">
        <CardHeader className="gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.04em] text-[#31507d]">
            {formatDate(date)}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("today_heading")}</h1>
          <CardDescription>{t("today_subheading")}</CardDescription>
        </CardHeader>
      </Card>

      <TimelineSection date={date} timeline={timeline} onChanged={() => void refresh()} />

      {!isHydrated ? (
        <Card className="grid gap-4" aria-live="polite">
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("today_loading_heading")}</h2>
            <CardDescription>{t("today_loading_text")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card
            role="region"
            aria-labelledby={recommendedHeadingId}
            className="grid gap-4"
          >
            <CardHeader className="gap-3">
              <div className="today-screen__heading-row">
                <h2 id={recommendedHeadingId} className="text-xl font-semibold">
                  {selectedSet?.name ?? t("today_recommended_heading")}
                </h2>
                {selectedSet ? null : (
                  <button type="button" className="today-screen__reshuffle" onClick={reshuffleRecommendations}>
                    <RotateCw aria-hidden="true" size={14} />
                    {t("today_recommended_reshuffle")}
                  </button>
                )}
              </div>
              <SetSwitcher
                ariaLabel={t("today_source_aria")}
                allLabel={t("today_recommended_heading")}
                sets={sets}
                selectedId={selectedSet?.id ?? null}
                onSelect={selectSet}
              />
            </CardHeader>
            <CardContent>
              {selectedSet && selectedSetExercises.length === 0 ? (
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">{t("today_set_empty")}</p>
                  <div className="button-row">
                    <Link href="/library" className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}>
                      {t("today_library_button")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="today-screen__recommendations">
                  {cards.map(({ exercise, slot }) => (
                    <div key={exercise.id} className="grid gap-2">
                      <RecommendedExerciseCard
                        exercise={exercise}
                        slot={slot}
                        todayCount={logCounts[exercise.id] ?? 0}
                        sets={sets}
                        onSetsChanged={() => void reloadSets()}
                        watchHref={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
                        onLog={(result) => void handleLog(exercise, result)}
                      />
                      {logErrorExerciseId === exercise.id ? (
                        <p role="alert" className="text-sm text-destructive">
                          {t("log_save_error")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
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
