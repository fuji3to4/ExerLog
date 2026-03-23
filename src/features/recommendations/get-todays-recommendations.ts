import { toDayKey } from "@/lib/date/day-key";
import type { ConditionLevel, ExerciseVideo } from "@/lib/types";

type GetTodaysRecommendationsOptions = {
  catalog: ExerciseVideo[];
  conditionLevel: ConditionLevel;
  date: Date | string;
};

function getRotationOffset(date: Date | string, total: number): number {
  if (total === 0) {
    return 0;
  }

  const [, month, day] = toDayKey(date).split("-").map(Number);
  return (month * day) % total;
}

export function getTodaysRecommendations({
  catalog,
  conditionLevel,
  date,
}: GetTodaysRecommendationsOptions): ExerciseVideo[] {
  const eligibleItems =
    conditionLevel === "tired"
      ? catalog.filter((item) => item.intensity !== "high")
      : catalog;

  const offset = getRotationOffset(date, eligibleItems.length);
  const rotatedItems = eligibleItems.slice(offset).concat(eligibleItems.slice(0, offset));

  return rotatedItems.slice(0, 3);
}
