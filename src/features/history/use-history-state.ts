"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toDayKey } from "@/lib/date/day-key";

import {
  getHistoryDaySummary,
  listCalendarMarksInMonth,
  type CalendarMark,
  type HistoryDaySummary,
} from "./history-query";

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year!, m! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calendar month, its marks, the selected day and that day's summary — shared by
 * the history screen and the history dashboard.
 */
export function useHistoryState(initialMonth?: string) {
  const [today] = useState(() => toDayKey(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth ?? today.slice(0, 7));
  const [marks, setMarks] = useState<Record<string, CalendarMark>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(() => (initialMonth ? null : today));
  const [summary, setSummary] = useState<HistoryDaySummary | null>(null);
  const marksRequest = useRef(0);
  const summaryRequest = useRef(0);

  const refreshMarks = useCallback(async () => {
    const current = ++marksRequest.current;
    const next = await listCalendarMarksInMonth(currentMonth);
    if (current === marksRequest.current) setMarks(next);
  }, [currentMonth]);

  const loadSummary = useCallback(async (date: string) => {
    const current = ++summaryRequest.current;
    const next = await getHistoryDaySummary(date);
    if (current === summaryRequest.current) setSummary(next);
  }, []);

  useEffect(() => {
    void refreshMarks();
  }, [refreshMarks]);

  useEffect(() => {
    if (initialMonth) return;
    void loadSummary(today);
    // Only the initial "today" summary; later selections load explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeMonth(delta: number) {
    setCurrentMonth((month) => shiftMonth(month, delta));
    setSelectedDate(null);
    summaryRequest.current++;
    setSummary(null);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    void loadSummary(date);
  }

  /** Timeline rows were added, edited or deleted: the marks may have changed. */
  function handleTimelineChanged() {
    void refreshMarks();
  }

  return {
    currentMonth,
    marks,
    selectedDate,
    summary,
    prevMonth: () => changeMonth(-1),
    nextMonth: () => changeMonth(1),
    selectDate,
    handleTimelineChanged,
  };
}
