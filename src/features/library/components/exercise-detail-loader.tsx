"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExerciseById } from "@/features/storage/exercise-catalog.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseDetailScreen } from "./exercise-detail-screen";

type ExerciseDetailLoaderProps = {
  exerciseId?: string;
};

export function ExerciseDetailLoader({ exerciseId }: ExerciseDetailLoaderProps) {
  const [exercise, setExercise] = useState<ExerciseVideo | null | undefined>(undefined);
  const { t } = useTranslation();
  const resolvedExerciseId =
    exerciseId ??
    (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("exerciseId") ?? "");

  useEffect(() => {
    if (!resolvedExerciseId) {
      setExercise(null);
      return;
    }

    void getExerciseById(resolvedExerciseId).then((found) => setExercise(found ?? null));
  }, [resolvedExerciseId]);

  if (exercise === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("detail_loading_heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("detail_loading_text")}</p>
        </CardContent>
      </Card>
    );
  }

  if (exercise === null) {
    return (
      <Card>
        <CardContent>
          <p>{t("exercise_not_found")}</p>
        </CardContent>
      </Card>
    );
  }

  return <ExerciseDetailScreen exercise={exercise} />;
}
