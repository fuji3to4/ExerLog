"use client";

import { useEffect, useState } from "react";

import { getExerciseById } from "@/features/storage/exercise-catalog.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseDetailScreen } from "./exercise-detail-screen";

type ExerciseDetailLoaderProps = {
  exerciseId: string;
};

export function ExerciseDetailLoader({ exerciseId }: ExerciseDetailLoaderProps) {
  const [exercise, setExercise] = useState<ExerciseVideo | null | undefined>(undefined);
  const { t } = useTranslation();

  useEffect(() => {
    void getExerciseById(exerciseId).then((found) => setExercise(found ?? null));
  }, [exerciseId]);

  if (exercise === undefined) {
    return (
      <section className="card">
        <h2>{t("detail_loading_heading")}</h2>
        <p>{t("detail_loading_text")}</p>
      </section>
    );
  }

  if (exercise === null) {
    return (
      <section className="card">
        <p>{t("exercise_not_found")}</p>
      </section>
    );
  }

  return <ExerciseDetailScreen exercise={exercise} />;
}
