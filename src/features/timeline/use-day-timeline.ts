"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { listWatchEventsForDay } from "@/features/storage/watch-events.repository";
import { listWellnessEntriesForDay } from "@/features/storage/wellness-entries.repository";
import { buildTimeline, type TimelineItem } from "./build-timeline";

/** How long a newly added row keeps its highlight (covers the pop animation). */
export const HIGHLIGHT_MS = 2000;

export type DayTimelineState = {
  items: TimelineItem[];
  isLoaded: boolean;
  highlightId: string | null;
  reload(highlightId?: string): Promise<void>;
};

async function loadDay(date: string): Promise<TimelineItem[]> {
  const [wellness, watches, logs, exercises] = await Promise.all([
    listWellnessEntriesForDay(date),
    listWatchEventsForDay(date),
    listExerciseLogsForDay(date),
    listAllExercises(),
  ]);
  const titles = new Map(exercises.map((exercise) => [exercise.id, exercise.title]));
  return buildTimeline({ wellness, watches, logs, titles });
}

export function useDayTimeline(date: string): DayTimelineState {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const requestId = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(
    async (nextHighlightId?: string) => {
      const current = ++requestId.current;
      const loaded = await loadDay(date);
      if (current !== requestId.current) return;

      setItems(loaded);
      setIsLoaded(true);
      if (nextHighlightId) {
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        setHighlightId(nextHighlightId);
        highlightTimer.current = setTimeout(() => {
          highlightTimer.current = null;
          setHighlightId(null);
        }, HIGHLIGHT_MS);
      }
    },
    [date],
  );

  useEffect(() => {
    setIsLoaded(false);
    void reload();
  }, [reload]);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  return { items, isLoaded, highlightId, reload };
}
