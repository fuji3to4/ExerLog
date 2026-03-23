export type ConditionLevel = "good" | "okay" | "tired";

export type ExerciseLogResult = "did" | "partial" | "could_not";

export type ExerciseIntensity = "low" | "medium" | "high";

export type ExerciseVideo = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  bodyArea: string;
  purpose: string;
  durationMinutes: number;
  intensity: ExerciseIntensity;
};

export type ExerciseLog = {
  id: string;
  date: string;
  exerciseId: string;
  result: ExerciseLogResult;
  loggedAt: string;
};

export type DailyConditionEntry = {
  date: string;
  conditionLevel: ConditionLevel;
  note: string;
  updatedAt: string;
};
