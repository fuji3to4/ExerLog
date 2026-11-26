import type { TimelineItem } from "./build-timeline";

export type RulerClip = {
  item: TimelineItem;
  /** Share of the span (0–1) from the ruler start. */
  x: number;
  /** Share of the span; 0 for a point. Already clipped so x + width <= 1. */
  width: number;
  row: number;
  isPoint: boolean;
};

const LANE_ORDER: TimelineItem["kind"][] = ["module", "exercise", "watch"];

/** Wall-clock hours of a local ISO string ("…T14:30…" → 14.5). */
export function hoursOf(iso: string): number {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h + m / 60;
}

/** Group key: `module:<moduleId>` for module records, otherwise the kind (`exercise` / `watch`). */
export function rulerGroupOf(item: TimelineItem): string {
  if (item.kind === "module") return `module:${item.moduleId}`;
  return item.kind;
}

/** Hour a clip begins: exercises end at `at` (performedAt), so they begin one duration earlier. */
function startHourOf(item: TimelineItem): number {
  const at = hoursOf(item.at);
  return item.kind === "exercise" ? at - item.log.durationSeconds / 3600 : at;
}

/** Earliest clip start hour across items (floored at midnight); Infinity for an empty list. */
export function earliestHour(items: TimelineItem[]): number {
  return Math.min(...items.map((item) => Math.max(0, startHourOf(item))));
}

function lengthHours(item: TimelineItem, nowHours: number | undefined): number {
  if (item.kind === "exercise") return item.log.durationSeconds / 3600;
  if (item.kind === "module") {
    const { endedAt } = item.record;
    if (endedAt) return (Date.parse(endedAt) - Date.parse(item.at)) / 3_600_000;
    if (endedAt === null && nowHours !== undefined) return nowHours - hoursOf(item.at);
    return 0;
  }
  return 0;
}

type Span = { from: number; to: number; isPoint: boolean; group: string };

// Bands: strict (touching ends do not overlap). With any point involved: inclusive.
const overlaps = (a: Span, b: Span) =>
  a.isPoint || b.isPoint ? a.from <= b.to && b.from <= a.to : a.from < b.to && b.from < a.to;

/**
 * Lays records out on the ruler by real duration. One lane per kind (module, exercise, watch);
 * inside a lane a clip takes the first row free of clips from a different group.
 */
export function layoutRuler(
  items: TimelineItem[],
  opts: { start: number; span: number; nowHours?: number },
): { clips: RulerClip[]; rows: number } {
  const { start, span, nowHours } = opts;
  const clips: RulerClip[] = [];
  let rowBase = 0;

  for (const kind of LANE_ORDER) {
    const ofKind = items
      .filter((item) => item.kind === kind)
      .sort((a, b) => startHourOf(a) - startHourOf(b));
    if (ofKind.length === 0) continue;

    const rows: Span[][] = [];
    for (const item of ofKind) {
      const isExercise = item.kind === "exercise";
      // Exercises end at `at`; keep only the part at or after the ruler start.
      const from = isExercise ? Math.max(start, startHourOf(item)) : hoursOf(item.at);
      const length = isExercise ? hoursOf(item.at) - from : lengthHours(item, nowHours);
      const isPoint = !(length > 0) || (isExercise && item.log.durationSeconds <= 0);
      const candidate: Span = { from, to: isPoint ? from : from + length, isPoint, group: rulerGroupOf(item) };

      let row = rows.findIndex((placed) => !placed.some((p) => p.group !== candidate.group && overlaps(p, candidate)));
      if (row === -1) {
        row = rows.length;
        rows.push([]);
      }
      rows[row].push(candidate);

      const x = (from - start) / span;
      clips.push({ item, x, width: isPoint ? 0 : Math.min(length / span, 1 - x), row: rowBase + row, isPoint });
    }
    rowBase += rows.length;
  }

  return { clips, rows: rowBase };
}
