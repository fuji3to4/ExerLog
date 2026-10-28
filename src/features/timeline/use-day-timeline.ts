"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getModuleData } from "@/features/modules/data-registry";
import type { RecordModule } from "@/features/modules/types";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { listWatchEventsForDay } from "@/features/storage/watch-events.repository";
import { buildTimeline, type TimelineItem } from "./build-timeline";

/** How long a newly added row keeps its highlight (covers the pop animation). */
export const HIGHLIGHT_MS = 2000;

export type DayTimelineState = {
  items: TimelineItem[];
  isLoaded: boolean;
  highlightId: string | null;
  reload(highlightId?: string): Promise<void>;
};

const ID_SEPARATOR = "\n";

async function loadDay(date: string, moduleIds: readonly string[]): Promise<TimelineItem[]> {
  const [moduleRecords, watches, logs, exercises] = await Promise.all([
    Promise.all(
      moduleIds.flatMap((moduleId) => {
        const data = getModuleData(moduleId);
        return data ? [data.listForDay(date).then((records) => ({ moduleId, records }))] : [];
      }),
    ),
    listWatchEventsForDay(date),
    listExerciseLogsForDay(date),
    listAllExercises(),
  ]);
  const titles = new Map(exercises.map((exercise) => [exercise.id, exercise.title]));
  return buildTimeline({ moduleRecords, watches, logs, titles });
}

/**
 * One day's timeline over the given modules' records (in their order), watches and exercises.
 * Reloads when the date or the list of module ids changes.
 */
export function useDayTimeline(date: string, modules: readonly RecordModule[]): DayTimelineState {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const requestId = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A string, so a new array with the same modules does not trigger a reload.
  const moduleIdsKey = modules.map((module) => module.data.id).join(ID_SEPARATOR);

  const reload = useCallback(
    async (nextHighlightId?: string) => {
      const current = ++requestId.current;
      let loaded: TimelineItem[];
      try {
        loaded = await loadDay(date, moduleIdsKey === "" ? [] : moduleIdsKey.split(ID_SEPARATOR));
      } catch (error) {
        console.error(error);
        loaded = [];
      }
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
    [date, moduleIdsKey],
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
