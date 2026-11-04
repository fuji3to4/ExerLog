import { toDayKey } from "@/lib/date/day-key";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The day a video log should be filed under, carried as `?date=YYYY-MM-DD` from the
 * history timeline through the library to the detail page. Returns null when the URL
 * carries no usable date (malformed or in the future), meaning "log for today".
 */
export function parseLogDate(search: string, now: Date = new Date()): string | null {
  const value = new URLSearchParams(search).get("date");
  if (!value || !DAY_KEY.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || toDayKey(parsed) !== value) return null;
  return value <= toDayKey(now) ? value : null;
}

/** Appends the log date to an in-app link, leaving it unchanged when there is none. */
export function withLogDate(href: string, logDate: string | null): string {
  if (!logDate) return href;
  return `${href}${href.includes("?") ? "&" : "?"}date=${logDate}`;
}

/** "10/19" style label for a day key. */
export function shortDayLabel(dayKey: string): string {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${month}/${day}`;
}
