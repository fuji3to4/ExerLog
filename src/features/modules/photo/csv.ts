import type { PhotoRecord } from "@/lib/types";

import { formatTimestampForCsv } from "@/lib/date/format-timestamp";
import { toCsv } from "@/features/settings/csv/history-csv";

/** One row per record; the photos themselves are not exported, only how many there are. */
export function generatePhotosCsv(records: PhotoRecord[]): string {
  return toCsv(
    ["date", "recordedAt", "note", "photoCount"],
    records.map((record) => [
      record.date,
      formatTimestampForCsv(record.recordedAt),
      record.note,
      record.photoIds.length,
    ]),
  );
}
