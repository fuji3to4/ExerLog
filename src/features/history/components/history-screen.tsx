"use client";

import { useState } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";

import { useHistoryState } from "../use-history-state";
import { DaySummary } from "./day-summary";
import { HistoryCalendar } from "./history-calendar";
import { HistoryDayTimeline } from "./history-day-timeline";
import { HistoryGraphs } from "./history-graphs";

type HistoryScreenProps = {
  month?: string;
};

type HistoryMode = "summary" | "graph";

export function HistoryScreen({ month: initialMonth }: HistoryScreenProps = {}) {
  const history = useHistoryState(initialMonth);
  const [mode, setMode] = useState<HistoryMode>("summary");
  const { t } = useTranslation();

  return (
    <>
      <Card className="page-header">
        <CardHeader>
          <CardTitle>{t("history_heading")}</CardTitle>
          <p>{t("history_subheading")}</p>
        </CardHeader>
      </Card>

      <div className="history-screen__mode-toggle">
        <button
          type="button"
          onClick={() => setMode("summary")}
          className={`history-screen__mode-btn ${mode === "summary" ? "is-active" : ""}`}
        >
          {t("history_mode_summary")}
        </button>
        <button
          type="button"
          onClick={() => setMode("graph")}
          className={`history-screen__mode-btn ${mode === "graph" ? "is-active" : ""}`}
        >
          {t("history_mode_graphs")}
        </button>
      </div>

      {mode === "summary" && (
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

          <DaySummary
            selectedDate={history.selectedDate}
            summary={history.summary}
          />
        </>
      )}

      {mode === "graph" && <HistoryGraphs />}
    </>
  );
}
