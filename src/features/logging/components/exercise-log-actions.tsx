import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseLogResult } from "@/lib/types";

type ExerciseLogActionsProps = {
  todayCount: number;
  onLog: (result: ExerciseLogResult) => void;
};

/** Every press adds one log; the status shows how many logs exist today. */
export function ExerciseLogActions({ todayCount, onLog }: ExerciseLogActionsProps) {
  const { t } = useTranslation();

  const logActions: Array<{ label: string; value: ExerciseLogResult }> = [
    { label: t("result_did"), value: "did" },
    { label: t("result_partial"), value: "partial" },
  ];

  return (
    <div className="exercise-log-actions">
      <div className="exercise-log-actions__buttons" role="group" aria-label={t("result_group_label")}>
        {logActions.map((action) => (
          <button
            key={action.value}
            type="button"
            className="exercise-log-actions__button"
            onClick={() => onLog(action.value)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="exercise-log-actions__status" aria-live="polite">
        {todayCount > 0 ? t("log_count_today", { count: todayCount }) : t("result_not_logged")}
      </p>
    </div>
  );
}
