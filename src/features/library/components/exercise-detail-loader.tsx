"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExerciseById } from "@/features/storage/exercise-catalog.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import { LogDateNotice } from "@/features/logging/components/log-date-notice";
import { parseLogDate } from "@/features/logging/log-date";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseDetailScreen } from "./exercise-detail-screen";

/** Returns to wherever the detail page was opened from; the library when opened directly. */
function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/library");
    }
  }

  return (
    <button type="button" className="exercise-detail__back" onClick={handleBack}>
      {t("action_back")}
    </button>
  );
}

/** The exercise comes from ?exerciseId=<id>, so any id stored on this device can be opened. */
export function ExerciseDetailLoader() {
  // Read after mount: the static export prerenders without a URL.
  const [logDate, setLogDate] = useState<string | null>(null);
  useEffect(() => setLogDate(parseLogDate(window.location.search)), []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackButton />
      </div>
      <LogDateNotice logDate={logDate} />
      <ExerciseDetailContent logDate={logDate} />
    </div>
  );
}

function ExerciseDetailContent({ logDate }: { logDate: string | null }) {
  const [exercise, setExercise] = useState<ExerciseVideo | null | undefined>(undefined);
  const { t } = useTranslation();
  const resolvedExerciseId =
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("exerciseId") ?? "";

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

  return <ExerciseDetailScreen exercise={exercise} logDate={logDate} />;
}
