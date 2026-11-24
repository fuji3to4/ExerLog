import type { CSSProperties } from "react";

import type { TimelineItem } from "../build-timeline";

export type DayRulerProps = {
  items: TimelineItem[];
  highlightId: string | null;
  colorOf(item: TimelineItem): string | undefined;
  keyOf(item: TimelineItem): string;
  /** Wall-clock hours (0–24) for the "now" line; omitted on past days. */
  nowHours?: number;
};

const LANE_ORDER: TimelineItem["kind"][] = ["module", "exercise", "watch"];
const DEFAULT_START = 6;
/** A clip is never drawn narrower than this share of the day, so close records stay apart. */
const MIN_CLIP_SHARE = 0.035;

/** Wall-clock hours of a local ISO string ("…T14:30…" → 14.5). */
function hoursOf(iso: string): number {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h + m / 60;
}

type Placed = { item: TimelineItem; start: number; width: number; row: number };

/**
 * Lays clips out left to right. Each kind gets its own lane, and a clip that would
 * overlap the previous one in its lane drops to a new row inside that lane.
 */
function place(items: TimelineItem[], start: number, span: number): { placed: Placed[]; rows: number } {
  const placed: Placed[] = [];
  let rowBase = 0;

  for (const kind of LANE_ORDER) {
    const ofKind = items
      .filter((item) => item.kind === kind)
      .sort((a, b) => hoursOf(a.at) - hoursOf(b.at));
    if (ofKind.length === 0) continue;

    const rowEnds: number[] = [];
    for (const item of ofKind) {
      const at = (hoursOf(item.at) - start) / span;
      const length = item.kind === "exercise" ? item.log.durationSeconds / 3600 / span : 0;
      const width = Math.max(length, MIN_CLIP_SHARE);
      let row = rowEnds.findIndex((end) => end <= at);
      if (row === -1) {
        row = rowEnds.length;
        rowEnds.push(0);
      }
      rowEnds[row] = at + width;
      placed.push({ item, start: at, width, row: rowBase + row });
    }
    rowBase += rowEnds.length;
  }

  return { placed, rows: rowBase };
}

/**
 * The day on a ruler: each record as a clip at its time, one lane per kind.
 * A picture of the list below it, so it is hidden from assistive tech.
 */
export function DayRuler({ items, highlightId, colorOf, keyOf, nowHours }: DayRulerProps) {
  const earliest = Math.min(DEFAULT_START, ...items.map((item) => hoursOf(item.at)));
  const start = Math.floor(earliest / 3) * 3;
  const span = 24 - start;
  const { placed, rows } = place(items, start, span);
  const ticks = Array.from({ length: span / 3 + 1 }, (_, i) => start + i * 3);

  const percent = (share: number) => `${Math.min(share, 1) * 100}%`;

  return (
    <div className="day-ruler" aria-hidden="true">
      <div className="day-ruler__track" style={{ "--span": span, "--rows": Math.max(rows, 2) } as CSSProperties}>
        {placed.map(({ item, start: at, width, row }) => (
          <span
            key={keyOf(item)}
            className={item.id === highlightId ? "day-ruler__clip is-new" : "day-ruler__clip"}
            style={
              {
                "--x": percent(at),
                "--w": percent(Math.min(width, 1 - at)),
                "--row": row,
                "--c": colorOf(item),
              } as CSSProperties
            }
          />
        ))}
        {nowHours !== undefined && nowHours >= start ? (
          <span className="day-ruler__now" style={{ "--x": percent((nowHours - start) / span) } as CSSProperties} />
        ) : null}
      </div>
      <div className="day-ruler__ticks">
        {ticks.map((hour) => (
          <span key={hour} style={{ "--x": percent((hour - start) / span) } as CSSProperties}>
            {hour}
          </span>
        ))}
      </div>
    </div>
  );
}
