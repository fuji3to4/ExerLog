import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseLogResult } from "@/lib/types";

type ExerciseLogActionsProps = {
  todayCount: number;
  onLog: (result: ExerciseLogResult) => void;
  /** Set false when the caller shows today's status itself. */
  showStatus?: boolean;
  /** Short label ("10/19") when counting a past day instead of today. */
  dayLabel?: string;
  /** All-time count; when given, the status shows it next to the day's count, even when both are 0. */
  totalCount?: number;
};

/** Every press adds one log; the status shows how many logs exist today. */
export function ExerciseLogActions({ todayCount, onLog, showStatus = true, dayLabel, totalCount }: ExerciseLogActionsProps) {
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
      {showStatus ? (
        <p className="exercise-log-actions__status" aria-live="polite">
          {totalCount !== undefined
            ? dayLabel
              ? t("log_count_on_day_total", { date: dayLabel, count: todayCount, total: totalCount })
              : t("log_count_today_total", { count: todayCount, total: totalCount })
            : todayCount === 0
            ? t("result_not_logged")
            : dayLabel
              ? t("log_count_on_day", { date: dayLabel, count: todayCount })
              : t("log_count_today", { count: todayCount })}
        </p>
      ) : null}
    </div>
  );
}
