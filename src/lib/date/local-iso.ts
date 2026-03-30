/**
 * Returns the current local time as an ISO 8601 string with UTC offset.
 * Example: "2024-03-30T14:32:00+09:00"
 *
 * Unlike new Date().toISOString() which always returns UTC ("Z"),
 * this captures the local wall-clock time and offset, making stored
 * timestamps self-describing.
 */
export function localIsoNow(): string {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const h = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const m = String(absMinutes % 60).padStart(2, "0");
  // Shift the UTC instant by the offset so that toISOString() yields local time digits
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  return `${local.toISOString().slice(0, 19)}${sign}${h}:${m}`;
}
