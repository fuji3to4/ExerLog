"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";

import { useHistoryState } from "../use-history-state";
import { HistoryCalendar } from "./history-calendar";
import { HistoryDayTimeline } from "./history-day-timeline";
import { HistoryGraphs } from "./history-graphs";

type HistoryDashboardProps = {
  month?: string;
};

export function HistoryDashboard({ month: initialMonth }: HistoryDashboardProps = {}) {
  const history = useHistoryState(initialMonth);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="page-header">
        <CardHeader>
          <CardTitle>{t("history_heading")}</CardTitle>
          <p>{t("history_subheading")}</p>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <HistoryCalendar
            month={history.currentMonth}
            marks={history.marks}
            selectedDate={history.selectedDate}
            onSelectDate={history.selectDate}
            onPrevMonth={history.prevMonth}
            onNextMonth={history.nextMonth}
          />
          {history.selectedDate ? (
            <HistoryDayTimeline
              key={history.selectedDate}
              date={history.selectedDate}
              onChanged={history.handleTimelineChanged}
            />
          ) : null}
        </div>

        <div>
          <HistoryGraphs />
        </div>
      </div>
    </div>
  );
}
