"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

import { DaySummary } from "./day-summary";
import { HistoryCalendar } from "./history-calendar";
import { getHistoryDaySummary, listCompletedDaysInMonth, type HistoryDaySummary } from "../history-query";

type HistoryScreenProps = {
  month: string;
};

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function HistoryScreen({ month: initialMonth }: HistoryScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [summary, setSummary] = useState<HistoryDaySummary | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let isActive = true;

    async function loadCompletedDays() {
      const days = await listCompletedDaysInMonth(currentMonth);

      if (!isActive) {
        return;
      }

      setCompletedDays(days);
    }

    void loadCompletedDays();

    return () => {
      isActive = false;
    };
  }, [currentMonth]);

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
  );
}
