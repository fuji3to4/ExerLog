export type ConditionLevel = "good" | "okay" | "tired";

export type ExerciseLogResult = "did" | "partial";

export type ExerciseIntensity = "low" | "medium" | "high";

export type WellnessScore = 1 | 2 | 3 | 4 | 5;

export type ExerciseVideo = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  bodyArea: string;
  purpose: string;
  durationSeconds: number;
  intensity: ExerciseIntensity;
  /** Local ISO time of the last catalog write; used by sync (last-writer-wins, tombstones). */
  updatedAt: string;
};

/** Exercise fields supplied by callers; repositories stamp `updatedAt` on write. */
export type ExerciseDraft = Omit<ExerciseVideo, "updatedAt">;

export type ExerciseLog = {
  id: string;
  date: string;
  exerciseId: string;
  result: ExerciseLogResult;
  performedAt: string;
  durationSeconds: number;
  updatedAt: string;
};

export type WellnessEntry = {
  id: string;
  date: string;
  recordedAt: string;
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
  note: string;
  updatedAt: string;
};

export type MeasurementRecord = {
  id: string;
  date: string;
  recordedAt: string;
  values: Record<string, number>;
  note: string;
  updatedAt: string;
};

export type WatchEvent = {
  id: string;
  date: string;
  exerciseId: string;
  watchedAt: string;
  updatedAt: string;
};

export type Tombstone = {
  /** `${table}:${recordId}` */
  id: string;
  table: string;
  recordId: string;
  deletedAt: string;
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

/** A photo record: one moment with a memo and one or more photos (in display order). */
export type PhotoRecord = {
  id: string;
  date: string;
  recordedAt: string;
  note: string;
  photoIds: string[];
  updatedAt: string;
};

/** 端末に保存した写真。blob が null なら未取得（ドライブにだけある）。 */
export type PhotoBlob = {
  id: string;
  recordId: string;
  blob: Blob | null;
  width: number;
  height: number;
};

/** シート PhotoFiles の1行。id = 写真の id。 */
export type PhotoFile = {
  id: string;
  recordId: string;
  driveFileId: string;
  updatedAt: string;
};

export type PhotoTrashItem = {
  driveFileId: string;
  queuedAt: string;
};
