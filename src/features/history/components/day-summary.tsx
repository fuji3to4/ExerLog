"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";

import type { HistoryDaySummary } from "../history-query";

type DaySummaryProps = {
  selectedDate: string | null;
  summary: HistoryDaySummary | null;
};

/** Self-care for the selected day. Body measurements live on the day timeline. */
export function DaySummary({ selectedDate, summary }: DaySummaryProps) {
  const { t } = useTranslation();

  if (!selectedDate || !summary) {
    return (
      <Card className="day-summary">
        <CardHeader>
          <CardTitle>{t("history_day_summary_heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("history_day_summary_empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="day-summary">
      <CardHeader>
        <CardTitle>{t("history_day_summary_heading")}</CardTitle>
      </CardHeader>

      <CardContent>
        {summary.selfCareLogs.length > 0 ? (
          <div className="day-summary__section">
            <h3>{t("history_self_care_heading")}</h3>
            <ul className="day-summary__list">
              {summary.selfCareLogs.map((entry) => (
                <li key={entry.selfCareId} className="day-summary__item">
                  <span>{entry.title}</span>
                  {entry.isDone ? <p>{t("self_care_done_label")}</p> : null}
                  {entry.count !== null ? <p>{`${t("self_care_count_label")}: ${entry.count}`}</p> : null}
                  {entry.minutes !== null ? (
                    <p>{`${t("self_care_minutes_label")}: ${entry.minutes}`}</p>
                  ) : null}
                  {entry.note ? <p>{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
