import type { CSSProperties } from "react";

import type { TimelineItem } from "../build-timeline";
import { earliestHour, layoutRuler } from "../ruler-layout";

export type DayRulerProps = {
  items: TimelineItem[];
  highlightId: string | null;
  colorOf(item: TimelineItem): string | undefined;
  keyOf(item: TimelineItem): string;
  /** Wall-clock hours (0–24) for the "now" line; omitted on past days. */
  nowHours?: number;
};

const DEFAULT_START = 6;

/**
 * The day on a ruler: each record as a clip at its time, one lane per kind.
 * A picture of the list below it, so it is hidden from assistive tech.
 */
export function DayRuler({ items, highlightId, colorOf, keyOf, nowHours }: DayRulerProps) {
  const earliest = Math.min(DEFAULT_START, earliestHour(items));
  const start = Math.floor(earliest / 3) * 3;
  const span = 24 - start;
  const { clips, rows } = layoutRuler(items, { start, span });
  const ticks = Array.from({ length: span / 3 + 1 }, (_, i) => start + i * 3);

  const percent = (share: number) => `${Math.min(share, 1) * 100}%`;

  return (
    <div className="day-ruler" aria-hidden="true">
      <div className="day-ruler__track" style={{ "--span": span, "--rows": Math.max(rows, 2) } as CSSProperties}>
        {clips.map(({ item, x, width, row, isPoint }) => (
          <span
            key={keyOf(item)}
            className={["day-ruler__clip", isPoint ? "is-point" : "", item.id === highlightId ? "is-new" : ""]
              .filter(Boolean)
              .join(" ")}
            style={
              {
                "--x": percent(x),
                "--w": percent(width),
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
