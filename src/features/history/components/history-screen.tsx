"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

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
  const { t } = useTranslation();

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

  async function handleSummaryChanged() {
    if (selectedDate) {
      setSummary(await getHistoryDaySummary(selectedDate));
      const days = await listCompletedDaysInMonth(month);
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
        month={month}
        completedDays={completedDays}
        selectedDate={selectedDate}
        onSelectDate={(date) => void handleSelectDate(date)}
      />

      <DaySummary selectedDate={selectedDate} summary={summary} onChanged={() => void handleSummaryChanged()} />
    </>
  );
}
