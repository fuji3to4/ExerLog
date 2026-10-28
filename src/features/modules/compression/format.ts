import type { CompressionRecord } from "@/lib/types";

/** "8:10" in the device's local time (no leading zero on the hour). */
export function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "10/27" in the device's local time. */
export function monthDayOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function localDayOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "8:10" for a start today, "10/27 22:00" for an earlier day. */
export function startLabel(record: Pick<CompressionRecord, "recordedAt">): string {
  const isToday = localDayOf(record.recordedAt) === localDayOf(new Date().toISOString());
  return isToday ? clockOf(record.recordedAt) : `${monthDayOf(record.recordedAt)} ${clockOf(record.recordedAt)}`;
}

/** "21:30", or "10/29 7:00" when taken off on another day than it was put on. */
export function endLabel(record: Pick<CompressionRecord, "recordedAt"> & { endedAt: string }): string {
  const sameDay = localDayOf(record.recordedAt) === localDayOf(record.endedAt);
  return sameDay ? clockOf(record.endedAt) : `${monthDayOf(record.endedAt)} ${clockOf(record.endedAt)}`;
}
