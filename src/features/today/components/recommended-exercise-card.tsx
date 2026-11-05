import type { ReactNode } from "react";

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
  /** All-time log count, shown next to today's. */
  totalCount: number;
  watchHref: string;
  sets: ExerciseSet[];
  onSetsChanged: () => void;
  onLog: (result: ExerciseLogResult) => void;
  /** Inline player shown in place of the thumbnail. */
  media?: ReactNode;
  /** Overrides the link: taps call this instead of opening the detail screen. */
  onActivate?: () => void;
};

export function RecommendedExerciseCard({
  exercise,
  slot = null,
  todayCount,
  totalCount,
  watchHref,
  sets,
  onSetsChanged,
  onLog,
  media,
  onActivate,
}: RecommendedExerciseCardProps) {
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  return (
    <VideoCard
      exercise={exercise}
      href={watchHref}
      media={media}
      onActivate={onActivate}
      headingLevel={3}
      eyebrow={slot ? t(`recommendation_slot_${slot}`) : undefined}
      meta={[
        t("meta_intensity_value", { value: formatIntensity(exercise.intensity) }),
        formatBodyArea(exercise.bodyArea),
        formatPurpose(exercise.purpose),
      ]}
      menu={<ExerciseSetMenu exercise={exercise} sets={sets} onChanged={onSetsChanged} />}
    >
      <ExerciseLogActions todayCount={todayCount} totalCount={totalCount} onLog={onLog} />
    </VideoCard>
  );
}
