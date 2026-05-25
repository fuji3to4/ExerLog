"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

import { DaySummary } from "./day-summary";
import { HistoryCalendar } from "./history-calendar";
import { HistoryGraphs } from "./history-graphs";
import { getHistoryDaySummary, listCompletedDaysInMonth, type HistoryDaySummary } from "../history-query";
import { toDayKey } from "@/lib/date/day-key";

type HistoryScreenProps = {
  month?: string;
};

type HistoryMode = "summary" | "graph";

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function HistoryScreen({ month: initialMonth }: HistoryScreenProps = {}) {
  const today = toDayKey(new Date());
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth ?? today.slice(0, 7));
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => initialMonth ? null : today);
  const [summary, setSummary] = useState<HistoryDaySummary | null>(null);
  const [mode, setMode] = useState<HistoryMode>("summary");
  const { t } = useTranslation();

  useEffect(() => {
    let isActive = true;

    async function loadCompletedDays() {
      const days = await listCompletedDaysInMonth(currentMonth);
      if (!isActive) return;
      setCompletedDays(days);
    }

    void loadCompletedDays();

    return () => {
      isActive = false;
    };
  }, [currentMonth]);

  useEffect(() => {
    if (initialMonth) return;

    let isActive = true;

    async function loadTodaySummary() {
      const todaySummary = await getHistoryDaySummary(today);
      if (!isActive) return;
      setSummary(todaySummary);
    }

    void loadTodaySummary();

    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePrevMonth() {
    setCurrentMonth((m) => shiftMonth(m, -1));
    setSelectedDate(null);
    setSummary(null);
  }

  function handleNextMonth() {
    setCurrentMonth((m) => shiftMonth(m, 1));
    setSelectedDate(null);
    setSummary(null);
  }

  async function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSummary(await getHistoryDaySummary(date));
  }

  async function handleSummaryChanged() {
    if (selectedDate) {
      setSummary(await getHistoryDaySummary(selectedDate));
      const days = await listCompletedDaysInMonth(currentMonth);
      setCompletedDays(days);
    }
  }

  return (
    <>
      <section className="card page-header">
        <h1>{t("history_heading")}</h1>
        <p>{t("history_subheading")}</p>
      </section>

      <div className="history-screen__mode-toggle">
        <button
          onClick={() => setMode("summary")}
          className={`history-screen__mode-btn ${mode === "summary" ? "is-active" : ""}`}
        >
          Summary
        </button>
        <button
          onClick={() => setMode("graph")}
          className={`history-screen__mode-btn ${mode === "graph" ? "is-active" : ""}`}
        >
          Graphs
        </button>
      </div>

      {mode === "summary" && (
        <>
          <HistoryCalendar
            month={currentMonth}
            completedDays={completedDays}
            selectedDate={selectedDate}
            onSelectDate={(date) => void handleSelectDate(date)}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <DaySummary selectedDate={selectedDate} summary={summary} onChanged={() => void handleSummaryChanged()} />
        </>
      )}

      {mode === "graph" && <HistoryGraphs />}
    </>
  );
}
