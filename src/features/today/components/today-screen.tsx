"use client";

import Link from "next/link";

import { DailyConditionCard } from "./daily-condition-card";
import { RecommendedExerciseCard } from "./recommended-exercise-card";
import { useTodayData } from "../use-today-data";

type TodayScreenProps = {
  date: string;
};

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function TodayScreen({ date }: TodayScreenProps) {
  const {
    isHydrated,
    conditionLevel,
    note,
    recommendations,
    logResults,
    setConditionLevel,
    setNote,
    saveCondition,
    logExercise,
  } = useTodayData(date);

  return (
    <>
      <section className="card page-header">
        <p className="today-screen__date">{formatDisplayDate(date)}</p>
        <h1>Today</h1>
        <p>Save how you feel, then log today&apos;s recommended exercises with one tap.</p>
      </section>

      {!isHydrated ? (
        <section className="card today-screen__section" aria-live="polite">
          <h2>Loading today&apos;s log...</h2>
          <p>Checking your saved condition and exercise results for this day.</p>
        </section>
      ) : (
        <>
      <DailyConditionCard
        conditionLevel={conditionLevel}
        note={note}
        onConditionLevelChange={setConditionLevel}
        onNoteChange={setNote}
        onSave={saveCondition}
      />

      <section className="today-screen__section">
        <div className="card today-screen__section-heading">
          <h2>Recommended for today</h2>
          <p>Today&apos;s list stays short so it&apos;s easy to start. Watch a clip or log the result right away.</p>
        </div>
        <div className="today-screen__recommendations">
          {recommendations.map((exercise) => (
            <RecommendedExerciseCard
              key={exercise.id}
              exercise={exercise}
              result={logResults[exercise.id] ?? null}
              watchHref={`/exercises/${exercise.id}`}
              onLog={(result) => void logExercise(exercise.id, result)}
            />
          ))}
        </div>
      </section>

      <section className="card today-screen__library-card">
        <h2>Need something else?</h2>
        <p>Browse the full library if you want a different movement or more context.</p>
        <div className="button-row">
          <Link href="/library" className="button-secondary">
            Library
          </Link>
        </div>
      </section>
        </>
      )}
    </>
  );
}
