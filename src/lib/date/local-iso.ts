function formatLocalIso(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const h = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const m = String(absMinutes % 60).padStart(2, "0");
  // Shift the UTC instant by the offset so that toISOString() yields local time digits
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  return `${local.toISOString().slice(0, 19)}${sign}${h}:${m}`;
}

/**
 * Returns the current local time as an ISO 8601 string with UTC offset.
 * Example: "2024-03-30T14:32:00+09:00"
 *
 * Unlike new Date().toISOString() which always returns UTC ("Z"),
 * this captures the local wall-clock time and offset, making stored
 * timestamps self-describing.
 */
export function localIsoNow(): string {
  return formatLocalIso(new Date());
}

/**
 * Local ISO string whose date is `dayKey` (YYYY-MM-DD) and whose time of day
 * is taken from `clock` (defaults to now). The offset is the local offset.
 */
export function localIsoAt(dayKey: string, clock: Date = new Date()): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return formatLocalIso(
    new Date(year, month - 1, day, clock.getHours(), clock.getMinutes(), clock.getSeconds()),
  );
}

/**
 * Replaces the hours and minutes of a local ISO string with `hhmm` ("HH:mm"),
 * zeroing the seconds and keeping the date and offset unchanged.
 */
export function withLocalTime(iso: string, hhmm: string): string {
  return `${iso.slice(0, 11)}${hhmm}:00${iso.slice(19)}`;
}

/** Returns the "HH:mm" part of a local ISO string. */
export function timeOfIso(iso: string): string {
  return iso.slice(11, 16);
}

/**
 * Turns an `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") into a
 * local ISO string with the device's offset at that moment (seconds are 00).
 */
export function localIsoFromInput(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return formatLocalIso(new Date(year, month - 1, day, hours, minutes));
}

/** The `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm") of a local ISO string. */
export function inputValueOfIso(iso: string): string {
  return iso.slice(0, 16);
}
