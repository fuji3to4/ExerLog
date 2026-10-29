import { useTranslation } from "@/features/i18n/use-translation";
import { ExerciseSetMenu } from "@/features/exercise-sets/components/exercise-set-menu";
import { ExerciseLogActions } from "@/features/logging/components/exercise-log-actions";
import { VideoCard } from "@/features/library/components/video-card";
import type { RecommendationSlot } from "@/features/recommendations/get-todays-recommendations";
import type { ExerciseLogResult, ExerciseSet, ExerciseVideo } from "@/lib/types";

type RecommendedExerciseCardProps = {
  exercise: ExerciseVideo;
  slot?: RecommendationSlot;
  todayCount: number;
  watchHref: string;
  sets: ExerciseSet[];
  onSetsChanged: () => void;
  onLog: (result: ExerciseLogResult) => void;
};

export function RecommendedExerciseCard({
  exercise,
  slot = null,
  todayCount,
  watchHref,
  sets,
  onSetsChanged,
  onLog,
}: RecommendedExerciseCardProps) {
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  return (
    <VideoCard
      exercise={exercise}
      href={watchHref}
      headingLevel={3}
      eyebrow={slot ? t(`recommendation_slot_${slot}`) : undefined}
      meta={[
        t("meta_intensity_value", { value: formatIntensity(exercise.intensity) }),
        formatBodyArea(exercise.bodyArea),
        formatPurpose(exercise.purpose),
      ]}
      menu={<ExerciseSetMenu exercise={exercise} sets={sets} onChanged={onSetsChanged} />}
    >
      <ExerciseLogActions todayCount={todayCount} onLog={onLog} />
    </VideoCard>
  );
}
