import type { HistoryDaySummary } from "../history-query";
import { useTranslation } from "@/features/i18n/use-translation";

type DaySummaryProps = {
  selectedDate: string | null;
  summary: HistoryDaySummary | null;
};

export function DaySummary({ selectedDate, summary }: DaySummaryProps) {
  const { t } = useTranslation();

  function formatResult(result: HistoryDaySummary["logs"][number]["result"]) {
    if (result === "did") {
      return t("result_did");
    }

    if (result === "partial") {
      return t("result_partial");
    }

    return t("result_couldnt");
  }

  function formatCondition(level: NonNullable<HistoryDaySummary["conditionLevel"]>) {
    if (level === "good") {
      return t("condition_good");
    }

    if (level === "okay") {
      return t("condition_okay");
    }

    return t("condition_tired");
  }

  if (!selectedDate || !summary) {
    return (
      <section className="card day-summary">
        <h2>{t("history_day_summary_heading")}</h2>
        <p>{t("history_day_summary_empty")}</p>
      </section>
    );
  }

  return (
    <section className="card day-summary">
      <h2>{t("history_day_summary_heading")}</h2>

      <div className="day-summary__section">
        <h3>{t("history_exercises_heading")}</h3>
        {summary.logs.length === 0 ? (
          <p>{t("history_no_exercises")}</p>
        ) : (
          <ul className="day-summary__list">
            {summary.logs.map((log) => (
              <li key={log.exerciseId} className="day-summary__item">
                <span>{log.title}</span>
                <span className="day-summary__result">{formatResult(log.result)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summary.conditionLevel ? (
        <div className="day-summary__section">
          <h3>{t("history_condition_heading")}</h3>
          <p>{formatCondition(summary.conditionLevel)}</p>
          {summary.note ? <p>{summary.note}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
