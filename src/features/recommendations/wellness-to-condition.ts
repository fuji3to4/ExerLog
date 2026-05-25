import type { ConditionLevel, WellnessScore } from "@/lib/types";

type WellnessToConditionInput = {
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
};

export function mapWellnessToCondition({
  physicalScore,
  mentalScore,
}: WellnessToConditionInput): ConditionLevel {
  const averageScore = (physicalScore + mentalScore) / 2;

  if (averageScore <= 2) {
    return "tired";
  }

  if (averageScore >= 4) {
    return "good";
  }

  return "okay";
}
