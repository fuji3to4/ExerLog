import type { PhotoRecord } from "@/lib/types";

export function summarizePhotos(
  records: PhotoRecord[],
): { count: number; photoCount: number; records: PhotoRecord[] } | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  return {
    count: sorted.length,
    photoCount: sorted.reduce((total, record) => total + record.photoIds.length, 0),
    records: sorted,
  };
}
