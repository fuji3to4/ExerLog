import { Dumbbell } from "lucide-react";

import { ExerciseHistoryView } from "./exercise-history-view";
import type { HistoryTab } from "./history-module-tabs";

/** The 運動 chip of the history tabs; always shown, whatever modules are ON. */
export const EXERCISE_HISTORY_TABS: readonly HistoryTab[] = [
  { id: "exercise", labelKey: "history_chip_exercise", icon: Dumbbell, View: ExerciseHistoryView },
];
