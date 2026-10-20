import { timeOfIso } from "@/lib/date/local-iso";
import type { ExerciseLog, WatchEvent, WellnessEntry } from "@/lib/types";

export type WellnessLabel = "morning" | "beforeVideo" | "afterVideo" | "night";

export type TimelineItem =
  | { kind: "wellness"; id: string; at: string; entry: WellnessEntry; label: WellnessLabel | null }
  | { kind: "watch"; id: string; at: string; event: WatchEvent; title: string }
  | { kind: "exercise"; id: string; at: string; log: ExerciseLog; title: string };

export const LABEL_WINDOW_MS = 30 * 60_000;

const KIND_ORDER: Record<TimelineItem["kind"], number> = { wellness: 0, watch: 1, exercise: 2 };

export function labelWellness(
  entry: WellnessEntry,
  watches: WatchEvent[],
  logs: ExerciseLog[],
): WellnessLabel | null {
  const e = Date.parse(entry.recordedAt);

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

  const hour = Number(timeOfIso(entry.recordedAt).slice(0, 2));
  if (hour >= 4 && hour <= 10) return "morning";
  if (hour >= 18) return "night";
  return null;
}

export function buildTimeline(input: {
  wellness: WellnessEntry[];
  watches: WatchEvent[];
  logs: ExerciseLog[];
  titles: Map<string, string>;
}): TimelineItem[] {
  const { wellness, watches, logs, titles } = input;
  const items: TimelineItem[] = [
    ...wellness.map((entry): TimelineItem => ({
      kind: "wellness",
      id: entry.id,
      at: entry.recordedAt,
      entry,
      label: labelWellness(entry, watches, logs),
    })),
    ...watches.map((event): TimelineItem => ({
      kind: "watch",
      id: event.id,
      at: event.watchedAt,
      event,
      title: titles.get(event.exerciseId) ?? event.exerciseId,
    })),
    ...logs.map((log): TimelineItem => ({
      kind: "exercise",
      id: log.id,
      at: log.performedAt,
      log,
      title: titles.get(log.exerciseId) ?? log.exerciseId,
    })),
  ];
  return items.sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}
