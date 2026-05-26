import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseLogResult } from "@/lib/types";

type ExerciseLogActionsProps = {
  result: ExerciseLogResult | null;
  onLog: (result: ExerciseLogResult) => void;
  onClear: () => void;
};

export function ExerciseLogActions({ result, onLog, onClear }: ExerciseLogActionsProps) {
  const { t } = useTranslation();

  const logActions: Array<{ label: string; value: ExerciseLogResult }> = [
    { label: t("result_did"), value: "did" },
    { label: t("result_partial"), value: "partial" },
  ];

  function getSavedStateLabel(result: ExerciseLogResult | null) {
    if (result === "did") {
      return t("result_saved_did");
    }

    if (result === "partial") {
      return t("result_saved_partial");
    }

    return t("result_not_logged");
  }

  return (
    <div className="exercise-log-actions">
      <div className="exercise-log-actions__buttons" role="group" aria-label={t("result_group_label")}>
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
        <button
          type="button"
          className="exercise-log-actions__button"
          aria-pressed={false}
          onClick={onClear}
        >
          {t("result_couldnt")}
        </button>
      </div>
      <p className="exercise-log-actions__status" aria-live="polite">
        {getSavedStateLabel(result)}
      </p>
    </div>
  );
}
