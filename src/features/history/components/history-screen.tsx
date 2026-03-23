"use client";

import { useEffect, useState } from "react";

import { DaySummary } from "./day-summary";
import { HistoryCalendar } from "./history-calendar";
import { getHistoryDaySummary, listCompletedDaysInMonth, type HistoryDaySummary } from "../history-query";

type HistoryScreenProps = {
  month: string;
};

export function HistoryScreen({ month }: HistoryScreenProps) {
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [summary, setSummary] = useState<HistoryDaySummary | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCompletedDays() {
      const days = await listCompletedDaysInMonth(month);

      if (!isActive) {
        return;
      }

      setCompletedDays(days);
    }

    void loadCompletedDays();

    return () => {
      isActive = false;
    };
  }, [month]);

  async function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSummary(await getHistoryDaySummary(date));
  }

  return (
    <>
      <section className="card page-header">
        <h1>History</h1>
        <p>Review your completed days and open a quick summary for the exercises and condition you logged.</p>
      </section>

      <HistoryCalendar
        month={month}
        completedDays={completedDays}
        selectedDate={selectedDate}
        onSelectDate={(date) => void handleSelectDate(date)}
      />

      <DaySummary selectedDate={selectedDate} summary={summary} />
    </>
  );
}
