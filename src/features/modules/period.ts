import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";

/** start / end are local ISO times (with offset); both ends are included. */
export type Period = { start: string; end: string };

/** The day keys (`YYYY-MM-DD`) of the period's ends. */
export function periodDayKeys(period: Period): { start: string; end: string } {
  return { start: toDayKey(period.start.slice(0, 10)), end: toDayKey(period.end.slice(0, 10)) };
}

/** Compares instants (Date.parse), not strings, so differing offsets order correctly. */
export function isWithinPeriod(at: string, period: Period): boolean {
  const time = Date.parse(at);
  return time >= Date.parse(period.start) && time <= Date.parse(period.end);
}

export function isValidPeriod(period: Period): boolean {
  return Date.parse(period.start) <= Date.parse(period.end);
}

/** Number of calendar days from the first to the last day of the period, both included. */
export function periodDayCount(period: Period): number {
  const { start, end } = periodDayKeys(period);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  // UTC midnights avoid DST shifts when dividing by the length of a day.
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
}

/** From 00:00:00 of the start day to 23:59:59 of the end day (local offset). */
export function periodOfDayRange(range: { start: string; end: string }): Period {
  return {
    start: localIsoAt(range.start, new Date(2000, 0, 1, 0, 0, 0)),
    end: localIsoAt(range.end, new Date(2000, 0, 1, 23, 59, 59)),
  };
}
