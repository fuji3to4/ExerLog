import Link from "next/link";

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
          aria-label={`Watch ${exercise.title}`}
        >
          Watch
        </Link>
      </div>

      <dl className="recommendation-card__meta">
        <div>
          <dt>Duration</dt>
          <dd>{exercise.durationMinutes} min</dd>
        </div>
        <div>
          <dt>Intensity</dt>
          <dd>{exercise.intensity}</dd>
        </div>
      </dl>

      <ExerciseLogActions result={result} onLog={onLog} />
    </article>
  );
}
