export type ConditionLevel = "good" | "okay" | "tired";

export type ExerciseLogResult = "did" | "partial";

export type ExerciseIntensity = "low" | "medium" | "high";

export type WellnessScore = 1 | 2 | 3 | 4 | 5;

export type MetricType = "height" | "weight" | "bodyFat";

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

export type DailyWellnessEntry = {
  date: string;
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
  note: string;
  updatedAt: string;
};

export type DailyMetricEntry = {
  id: string;
  date: string;
  metricType: MetricType;
  value: number;
  unit: string;
  recordedAt: string;
};

export type SelfCareItem = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isArchived: boolean;
};

export type DailySelfCareEntry = {
  id: string;
  date: string;
  selfCareId: string;
  isDone: boolean;
  count: number | null;
  minutes: number | null;
  note: string;
  recordedAt: string;
};
