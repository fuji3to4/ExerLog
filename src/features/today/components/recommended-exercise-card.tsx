import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { cn } from "@/lib/utils";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

type RecommendedExerciseCardProps = {
  exercise: ExerciseVideo;
  result: ExerciseLogResult | null;
  watchHref: string;
  onLog: (result: ExerciseLogResult) => void;
  onClear: () => void;
};

export function RecommendedExerciseCard({
  exercise,
  result,
  watchHref,
  onLog,
  onClear,
}: RecommendedExerciseCardProps) {
  const { t, formatIntensity } = useTranslation();
  const headingId = `recommendation-${exercise.id}`;
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

  return (
    <Card role="article" className="recommendation-card overflow-hidden p-0" aria-labelledby={headingId}>
      {thumbnailUrl ? (
        <div className="recommendation-card__thumbnail">
          <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
        </div>
      ) : null}
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="recommendation-card__header">
          <div>
            <h3 id={headingId}>{exercise.title}</h3>
            <p>{exercise.description}</p>
          </div>
          <Link
            href={watchHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "recommendation-card__watch-link")}
            aria-label={t("action_watch_aria", { title: exercise.title })}
          >
            {t("action_watch")}
          </Link>
        </div>

        <dl className="recommendation-card__meta">
          <div>
            <dt>{t("meta_duration")}</dt>
            <dd>{t("duration_minutes", { count: exercise.durationMinutes })}</dd>
          </div>
          <div>
            <dt>{t("meta_intensity")}</dt>
            <dd>{formatIntensity(exercise.intensity)}</dd>
          </div>
        </dl>

        <ExerciseLogActions result={result} onLog={onLog} onClear={onClear} />
      </CardContent>
    </Card>
  );
}
