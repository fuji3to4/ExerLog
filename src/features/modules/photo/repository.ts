import type { PhotoBlob, PhotoFile, PhotoRecord } from "@/lib/types";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import { scheduleSync } from "@/features/sync/auto-sync";

export const PHOTOS_TABLE = "Photos";
export const PHOTO_FILES_TABLE = "PhotoFiles";
export const MAX_PHOTOS_PER_RECORD = 20;

export type NewPhoto = { blob: Blob; width: number; height: number };

function byInstant(a: PhotoRecord, b: PhotoRecord): number {
  return Date.parse(a.recordedAt) - Date.parse(b.recordedAt);
}

function assertPhotoCount(count: number): void {
  if (count < 1 || count > MAX_PHOTOS_PER_RECORD) {
    throw new Error(`A photo record needs 1 to ${MAX_PHOTOS_PER_RECORD} photos (got ${count}).`);
  }
}

function toBlobRows(recordId: string, photos: NewPhoto[]): PhotoBlob[] {
  return photos.map((photo) => ({
    id: crypto.randomUUID(),
    recordId,
    blob: photo.blob,
    width: photo.width,
    height: photo.height,
  }));
}

/**
 * Removes the local data of `photoIds`: blob, file-map row (tombstoned) and, when a
 * Drive file is known, queues it for the trash. Must run inside a rw transaction
 * covering photoBlobs, photoFiles, photoTrash and tombstones.
 */
async function discardPhotos(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) {
    return;
  }
  const files = (await appDb.photoFiles.bulkGet(photoIds)).filter(
    (file): file is PhotoFile => file !== undefined,
  );
  const queuedAt = localIsoNow();
  await appDb.photoBlobs.bulkDelete(photoIds);
  await appDb.photoFiles.bulkDelete(photoIds);
  await appDb.photoTrash.bulkPut(
    files.filter((file) => file.driveFileId).map((file) => ({ driveFileId: file.driveFileId, queuedAt })),
  );
  await recordTombstones(PHOTO_FILES_TABLE, photoIds);
}

export async function addPhotoRecord(input: {
  date: string;
  recordedAt?: string;
  note: string;
  photos: NewPhoto[];
}): Promise<PhotoRecord> {
  assertPhotoCount(input.photos.length);
  const id = crypto.randomUUID();
  const blobs = toBlobRows(id, input.photos);
  const record: PhotoRecord = {
    id,
    date: input.date,
    recordedAt: input.recordedAt ?? localIsoAt(input.date),
    note: input.note.trim(),
    photoIds: blobs.map((row) => row.id),
    updatedAt: localIsoNow(),
  };
  await appDb.transaction("rw", appDb.photoRecords, appDb.photoBlobs, async () => {
    await appDb.photoBlobs.bulkAdd(blobs);
    await appDb.photoRecords.add(record);
  });
  scheduleSync();
  return record;
}

/** Updates a record. keepPhotoIds are the existing photos to keep (in order); added go last. */
export async function updatePhotoRecord(
  record: PhotoRecord,
  change: { note: string; recordedAt: string; keepPhotoIds: string[]; added: NewPhoto[] },
): Promise<PhotoRecord> {
  const existing = new Set(record.photoIds);
  const keep = change.keepPhotoIds.filter((photoId) => existing.has(photoId));
  assertPhotoCount(keep.length + change.added.length);
  const kept = new Set(keep);
  const removed = record.photoIds.filter((photoId) => !kept.has(photoId));
  const addedRows = toBlobRows(record.id, change.added);
  const updated: PhotoRecord = {
    ...record,
    note: change.note.trim(),
    recordedAt: change.recordedAt,
    photoIds: [...keep, ...addedRows.map((row) => row.id)],
    updatedAt: localIsoNow(),
  };
  await appDb.transaction(
    "rw",
    [appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash, appDb.tombstones],
    async () => {
      await discardPhotos(removed);
      await appDb.photoBlobs.bulkAdd(addedRows);
      await appDb.photoRecords.put(updated);
    },
  );
  scheduleSync();
  return updated;
}

export async function deletePhotoRecord(id: string): Promise<void> {
  await appDb.transaction(
    "rw",
    [appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash, appDb.tombstones],
    async () => {
      const record = await appDb.photoRecords.get(id);
      const [blobIds, fileIds] = await Promise.all([
        appDb.photoBlobs.where("recordId").equals(id).primaryKeys(),
        appDb.photoFiles.where("recordId").equals(id).primaryKeys(),
      ]);
      const photoIds = [...new Set([...(record?.photoIds ?? []), ...blobIds, ...fileIds])];
      await discardPhotos(photoIds);
      await appDb.photoRecords.delete(id);
      await recordTombstones(PHOTOS_TABLE, [id]);
    },
  );
  scheduleSync();
}

/** The day's records, oldest instant first. */
export async function listPhotoRecordsForDay(date: string): Promise<PhotoRecord[]> {
  return (await appDb.photoRecords.where("date").equals(date).toArray()).sort(byInstant);
}

/** Records whose date is within [start, end] (inclusive day keys), oldest first. */
export async function listPhotoRecordsInDayRange(start: string, end: string): Promise<PhotoRecord[]> {
  return (await appDb.photoRecords.where("date").between(start, end, true, true).toArray()).sort(byInstant);
}

export async function listAllPhotoRecords(): Promise<PhotoRecord[]> {
  return (await appDb.photoRecords.toArray()).sort(byInstant);
}

export function getPhotoBlob(photoId: string): Promise<PhotoBlob | undefined> {
  return appDb.photoBlobs.get(photoId);
}

/** Saves a photo downloaded from Drive into its (possibly placeholder) local row. */
export async function storeFetchedBlob(photoId: string, recordId: string, blob: Blob): Promise<void> {
  const existing = await appDb.photoBlobs.get(photoId);
  await appDb.photoBlobs.put({
    id: photoId,
    recordId,
    blob,
    width: existing?.width ?? 0,
    height: existing?.height ?? 0,
  });
}

export function getPhotoFile(photoId: string): Promise<PhotoFile | undefined> {
  return appDb.photoFiles.get(photoId);
}
