import type { ModuleRecord } from "@/features/modules/types";
import { timeOfIso } from "@/lib/date/local-iso";
import type { ExerciseLog, WatchEvent } from "@/lib/types";

export type WellnessLabel = "morning" | "beforeVideo" | "afterVideo" | "night";

export type TimelineItem =
  | { kind: "module"; moduleId: string; id: string; at: string; record: ModuleRecord; label: WellnessLabel | null }
  | { kind: "watch"; id: string; at: string; event: WatchEvent; title: string }
  | { kind: "exercise"; id: string; at: string; log: ExerciseLog; title: string };

export const LABEL_WINDOW_MS = 30 * 60_000;

export function labelAt(at: string, watches: WatchEvent[], logs: ExerciseLog[]): WellnessLabel | null {
  const e = Date.parse(at);

  let beforeDistance = Infinity;
  for (const watch of watches) {
    const diff = Date.parse(watch.watchedAt) - e;
    if (diff >= 0 && diff <= LABEL_WINDOW_MS) beforeDistance = Math.min(beforeDistance, diff);
  }

  let afterDistance = Infinity;
  const afterSources = [
    ...watches.map((watch) => Date.parse(watch.watchedAt)),
    ...logs.map((log) => Date.parse(log.performedAt)),
  ];
  for (const x of afterSources) {
    const diff = e - x;
    if (diff > 0 && diff <= LABEL_WINDOW_MS) afterDistance = Math.min(afterDistance, diff);
  }

  if (beforeDistance !== Infinity || afterDistance !== Infinity) {
    return afterDistance <= beforeDistance ? "afterVideo" : "beforeVideo";
  }

  const hour = Number(timeOfIso(at).slice(0, 2));
  if (hour >= 4 && hour <= 10) return "morning";
  if (hour >= 18) return "night";
  return null;
}

/**
 * Merges one day's records into a time-ordered list. Items at the same instant follow the
 * order of `moduleRecords` (the settings order), then watches, then exercises.
 */
export function buildTimeline(input: {
  moduleRecords: { moduleId: string; records: ModuleRecord[] }[];
  watches: WatchEvent[];
  logs: ExerciseLog[];
  titles: Map<string, string>;
}): TimelineItem[] {
  const { moduleRecords, watches, logs, titles } = input;
  const watchRank = moduleRecords.length;
  const ranked: { item: TimelineItem; rank: number }[] = [
    ...moduleRecords.flatMap(({ moduleId, records }, rank) =>
      records.map((record) => ({
        rank,
        item: {
          kind: "module" as const,
          moduleId,
          id: record.id,
          at: record.recordedAt,
          record,
          label: labelAt(record.recordedAt, watches, logs),
        },
      })),
    ),
    ...watches.map((event) => ({
      rank: watchRank,
      item: {
        kind: "watch" as const,
        id: event.id,
        at: event.watchedAt,
        event,
        title: titles.get(event.exerciseId) ?? event.exerciseId,
      },
    })),
    ...logs.map((log) => ({
      rank: watchRank + 1,
      item: {
        kind: "exercise" as const,
        id: log.id,
        at: log.performedAt,
        log,
        title: titles.get(log.exerciseId) ?? log.exerciseId,
      },
    })),
  ];
  return ranked
    .sort((a, b) => Date.parse(a.item.at) - Date.parse(b.item.at) || a.rank - b.rank)
    .map(({ item }) => item);
}
