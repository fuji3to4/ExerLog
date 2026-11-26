import { withLocalTime, timeOfIso } from "@/lib/date/local-iso";

/**
 * The end of a record that starts at `startIso` and ends at `endTime` ("HH:mm").
 * An end earlier than the start is the next day; empty or equal to the start is no end.
 */
export function endIsoFor(startIso: string, endTime: string): string | undefined {
  if (endTime === "" || endTime === timeOfIso(startIso)) return undefined;
  const sameDay = withLocalTime(startIso, endTime);
  if (endTime > timeOfIso(startIso)) return sameDay;
  const [year, month, day] = startIso.slice(0, 10).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return `${next}${sameDay.slice(10)}`;
}
