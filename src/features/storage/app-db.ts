import Dexie, { type EntityTable } from "dexie";

import type { DailyConditionEntry, ExerciseLog, ExerciseVideo } from "@/lib/types";

export class AppDb extends Dexie {
  logs!: EntityTable<ExerciseLog, "id">;
  conditions!: EntityTable<DailyConditionEntry, "date">;
  exercises!: EntityTable<ExerciseVideo, "id">;

  constructor() {
    super("exercise-log-mvp");

    this.version(1).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: "date, conditionLevel, note, updatedAt",
      exercises: "id, title, bodyArea, purpose, durationMinutes, intensity",
    });
  }
}

export const appDb = new AppDb();
