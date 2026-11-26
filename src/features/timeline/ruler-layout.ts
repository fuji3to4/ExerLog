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

/** Clips of one group never push each other apart; different groups may not overlap in a row. */
export function rulerGroupOf(item: TimelineItem): string {
  if (item.kind === "module") return `module:${item.moduleId}`;
  return item.kind;
}

function lengthHours(item: TimelineItem, nowHours: number | undefined): number {
  if (item.kind === "exercise") return item.log.durationSeconds / 3600;
  if (item.kind === "module") {
    const { endedAt } = item.record;
    if (endedAt) return (Date.parse(endedAt) - Date.parse(item.at)) / 3_600_000;
    return nowHours === undefined ? 0 : nowHours - hoursOf(item.at);
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
      .sort((a, b) => hoursOf(a.at) - hoursOf(b.at));
    if (ofKind.length === 0) continue;

    const rows: Span[][] = [];
    for (const item of ofKind) {
      const from = hoursOf(item.at);
      const length = lengthHours(item, nowHours);
      const isPoint = !(length > 0);
      const span_: Span = { from, to: isPoint ? from : from + length, isPoint, group: rulerGroupOf(item) };

      let row = rows.findIndex((placed) => !placed.some((p) => p.group !== span_.group && overlaps(p, span_)));
      if (row === -1) {
        row = rows.length;
        rows.push([]);
      }
      rows[row].push(span_);

      const x = (from - start) / span;
      clips.push({ item, x, width: isPoint ? 0 : Math.min(length / span, 1 - x), row: rowBase + row, isPoint });
    }
    rowBase += rows.length;
  }

  return { clips, rows: rowBase };
}
