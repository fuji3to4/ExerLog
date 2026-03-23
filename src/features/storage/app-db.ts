import Dexie, { type EntityTable } from "dexie";

import type { DailyConditionEntry, ExerciseLog } from "@/lib/types";

export class AppDb extends Dexie {
  logs!: EntityTable<ExerciseLog, "id">;
  conditions!: EntityTable<DailyConditionEntry, "date">;

  constructor() {
    super("exercise-log-mvp");

    this.version(1).stores({
      logs: "++id, date, exerciseId, result, loggedAt, &[date+exerciseId]",
      conditions: "date, conditionLevel, note, updatedAt",
    });
  }
}

export const appDb = new AppDb();
