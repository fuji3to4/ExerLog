import { toDayKey } from "@/lib/date/day-key";
import type { CompressionRecord } from "@/lib/types";

// All labels read the digits of the ISO string as recorded, like the timeline does.

/** "8:10" (no leading zero on the hour). */
export function clockOf(iso: string): string {
  return `${Number(iso.slice(11, 13))}:${iso.slice(14, 16)}`;
}

/** "10/27". */
export function monthDayOf(iso: string): string {
  return `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
}

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** "8:10" for a start today, "10/27 22:00" for an earlier day. */
export function startLabel(record: Pick<CompressionRecord, "recordedAt">): string {
  const isToday = dayOf(record.recordedAt) === toDayKey(new Date());
  return isToday ? clockOf(record.recordedAt) : `${monthDayOf(record.recordedAt)} ${clockOf(record.recordedAt)}`;
}

/** "21:30", or "10/29 7:00" when taken off on another day than it was put on. */
export function endLabel(record: Pick<CompressionRecord, "recordedAt"> & { endedAt: string }): string {
  const sameDay = dayOf(record.recordedAt) === dayOf(record.endedAt);
  return sameDay ? clockOf(record.endedAt) : `${monthDayOf(record.endedAt)} ${clockOf(record.endedAt)}`;
}
