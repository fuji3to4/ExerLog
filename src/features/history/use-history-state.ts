"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toDayKey } from "@/lib/date/day-key";

import { listCalendarMarksInMonth, type CalendarMark } from "./history-query";

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year!, m! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calendar month, its marks and the selected day — shared by the history screen
 * and the history dashboard.
 */
export function useHistoryState(initialMonth?: string) {
  const [today] = useState(() => toDayKey(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => initialMonth ?? today.slice(0, 7));
  const [marks, setMarks] = useState<Record<string, CalendarMark>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(() => (initialMonth ? null : today));
  const marksRequest = useRef(0);

  const refreshMarks = useCallback(async () => {
    const current = ++marksRequest.current;
    const next = await listCalendarMarksInMonth(currentMonth);
    if (current === marksRequest.current) setMarks(next);
  }, [currentMonth]);

  useEffect(() => {
    void refreshMarks();
  }, [refreshMarks]);

  function changeMonth(delta: number) {
    setCurrentMonth((month) => shiftMonth(month, delta));
    setSelectedDate(null);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
  }

  /** Timeline rows were added, edited or deleted: the marks may have changed. */
  function handleTimelineChanged() {
    void refreshMarks();
  }

  return {
    currentMonth,
    marks,
    selectedDate,
    prevMonth: () => changeMonth(-1),
    nextMonth: () => changeMonth(1),
    selectDate,
    handleTimelineChanged,
  };
}
