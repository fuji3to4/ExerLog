import Link from "next/link";

import { useTranslation } from "@/features/i18n/use-translation";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import type { ExerciseLogResult, ExerciseVideo } from "@/lib/types";

type RecommendedExerciseCardProps = {
  exercise: ExerciseVideo;
  result: ExerciseLogResult | null;
  watchHref: string;
  onLog: (result: ExerciseLogResult) => void;
};

export function RecommendedExerciseCard({
  exercise,
  result,
  watchHref,
  onLog,
}: RecommendedExerciseCardProps) {
  const { t, formatIntensity } = useTranslation();
  const headingId = `recommendation-${exercise.id}`;

  return (
    <article className="card recommendation-card" aria-labelledby={headingId}>
      <div className="recommendation-card__header">
        <div>
          <h3 id={headingId}>{exercise.title}</h3>
          <p>{exercise.description}</p>
        </div>
        <Link
          href={watchHref}
          className="recommendation-card__watch-link"
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

      <ExerciseLogActions result={result} onLog={onLog} />
    </article>
  );
}
