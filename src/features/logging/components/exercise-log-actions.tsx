import type { ExerciseLogResult } from "@/lib/types";

const logActions: Array<{ label: string; value: ExerciseLogResult }> = [
  { label: "Did it", value: "did" },
  { label: "Partly", value: "partial" },
  { label: "Couldn't", value: "could_not" },
];

type ExerciseLogActionsProps = {
  result: ExerciseLogResult | null;
  onLog: (result: ExerciseLogResult) => void;
};

function getSavedStateLabel(result: ExerciseLogResult | null) {
  if (result === "did") {
    return "Saved: Did it";
  }

  if (result === "partial") {
    return "Saved: Partly";
  }

  if (result === "could_not") {
    return "Saved: Couldn't";
  }

  return "Not logged yet";
}

export function ExerciseLogActions({ result, onLog }: ExerciseLogActionsProps) {
  return (
    <div className="exercise-log-actions">
      <div className="exercise-log-actions__buttons" role="group" aria-label="Log exercise result">
        {logActions.map((action) => (
          <button
            key={action.value}
            type="button"
            className={result === action.value ? "exercise-log-actions__button is-selected" : "exercise-log-actions__button"}
            aria-pressed={result === action.value}
            onClick={() => onLog(action.value)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="exercise-log-actions__status" aria-live="polite">
        {getSavedStateLabel(result)}
      </p>
    </div>
  );
}
