/**
 * Formats an ISO 8601 timestamp string (offset or UTC "Z") as "HH:MM"
 * using the browser's local timezone and locale.
 * Returns "" for empty or invalid input.
 */
export function formatTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formats an ISO 8601 timestamp string (offset or UTC "Z") as "YYYY-MM-DD HH:MM"
 * using the browser's local timezone in 24-hour format.
 * Returns "" for empty or invalid input.
 */
export function formatTimestampForCsv(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "2024-03-30"
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d); // "14:32" (24h, en-GB)
  return `${date} ${time}`;
}
