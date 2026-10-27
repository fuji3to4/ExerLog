"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { useModuleSettings } from "@/features/modules/use-module-settings";

import { useHistoryState } from "../use-history-state";
import { HistoryCalendar } from "./history-calendar";
import { HistoryDayTimeline } from "./history-day-timeline";
import { HistoryModuleTabs } from "./history-module-tabs";

type HistoryScreenProps = {
  month?: string;
};

export function HistoryScreen({ month: initialMonth }: HistoryScreenProps = {}) {
  const history = useHistoryState(initialMonth);
  const { enabledModules } = useModuleSettings();
  const { t } = useTranslation();

  return (
    <>
      <Card className="page-header">
        <CardHeader>
          <CardTitle>{t("history_heading")}</CardTitle>
          <p>{t("history_subheading")}</p>
        </CardHeader>
      </Card>

      <HistoryModuleTabs
        modules={enabledModules}
        includeAll
        allContent={
          <>
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
          </>
        }
      />
    </>
  );
}
