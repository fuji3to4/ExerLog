"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExerciseById } from "@/features/storage/exercise-catalog.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import { LogDateNotice } from "@/features/logging/components/log-date-notice";
import { parseLogDate } from "@/features/logging/log-date";
import { PlayerScreen } from "@/features/playlist/components/player-screen";
import type { ExerciseVideo } from "@/lib/types";

import { BackButton } from "./back-button";

/** The exercise comes from ?exerciseId=<id>, so any id stored on this device can be opened. */
export function ExerciseDetailLoader() {
  // Read after mount: the static export prerenders without a URL.
  const [logDate, setLogDate] = useState<string | null>(null);
  useEffect(() => setLogDate(parseLogDate(window.location.search)), []);

  return <ExerciseDetailContent logDate={logDate} />;
}

function Placeholder({ logDate, children }: { logDate: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackButton />
      </div>
      <LogDateNotice logDate={logDate} />
      {children}
    </div>
  );
}

function ExerciseDetailContent({ logDate }: { logDate: string | null }) {
  const [exercise, setExercise] = useState<ExerciseVideo | null | undefined>(undefined);
  const { t } = useTranslation();
  // Read once: continuous play rewrites ?exerciseId= as it advances, which must not reload this screen.
  const [resolvedExerciseId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("exerciseId") ?? "",
  );

  useEffect(() => {
    if (!resolvedExerciseId) {
      setExercise(null);
      return;
    }

    void getExerciseById(resolvedExerciseId).then((found) => setExercise(found ?? null));
  }, [resolvedExerciseId]);

  if (exercise === undefined) {
    return (
      <Placeholder logDate={logDate}>
        <Card>
          <CardHeader>
            <CardTitle>{t("detail_loading_heading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("detail_loading_text")}</p>
          </CardContent>
        </Card>
      </Placeholder>
    );
  }

  if (exercise === null) {
    return (
      <Placeholder logDate={logDate}>
        <Card>
          <CardContent>
            <p>{t("exercise_not_found")}</p>
          </CardContent>
        </Card>
      </Placeholder>
    );
  }

  return <PlayerScreen exercise={exercise} logDate={logDate} />;
}
