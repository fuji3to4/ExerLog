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
    <Card role="article" className="overflow-hidden p-0" aria-labelledby={headingId}>
      {thumbnailUrl ? (
        <div className="overflow-hidden bg-accent/30">
          <img className="block h-auto w-full object-cover" src={thumbnailUrl} alt={exercise.title} loading="lazy" />
        </div>
      ) : null}
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 min-[480px]:grid-cols-[minmax(0,1fr)_auto] min-[480px]:items-start">
          <div>
            <h3 id={headingId}>{exercise.title}</h3>
            <p>{exercise.description}</p>
          </div>
          <Link
            href={watchHref}
            className={cn(buttonVariants({ variant: "outline" }), "w-full min-[480px]:w-auto min-[480px]:shrink-0")}
            aria-label={t("action_watch_aria", { title: exercise.title })}
          >
            {t("action_watch")}
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/40 px-4 py-3">
            <dt className="mb-1 text-sm text-muted-foreground">{t("meta_duration")}</dt>
            <dd className="m-0 font-semibold capitalize">{t("duration_minutes", { count: exercise.durationMinutes })}</dd>
          </div>
          <div className="rounded-2xl bg-muted/40 px-4 py-3">
            <dt className="mb-1 text-sm text-muted-foreground">{t("meta_intensity")}</dt>
            <dd className="m-0 font-semibold capitalize">{formatIntensity(exercise.intensity)}</dd>
          </div>
        </dl>

        <ExerciseLogActions result={result} onLog={onLog} onClear={onClear} />
      </CardContent>
    </Card>
  );
}
