import { toDayKey } from "@/lib/date/day-key";

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
