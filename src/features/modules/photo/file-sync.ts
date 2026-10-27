import type { PhotoBlob } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import type { SyncTableResult } from "@/features/sync/sync-engine";
import { findOrCreatePhotoFolder, trashDriveFile, uploadPhoto } from "./drive";
import { readPhotoSyncEnabled } from "./photo-sync-setting";
import { PHOTO_FILES_TABLE, PHOTOS_TABLE } from "./repository";

const TABLE_NAME = "PhotoDrive";

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * True when the photo or its record has a tombstone. Called after the
 * Tombstones tab merge, so deletions made on other devices count even while the
 * record itself is still here (the Photos tab merges later).
 */
async function isTombstoned(photoId: string, recordId: string): Promise<boolean> {
  const [photo, record] = await appDb.tombstones.bulkGet([
    `${PHOTO_FILES_TABLE}:${photoId}`,
    `${PHOTOS_TABLE}:${recordId}`,
  ]);
  return photo !== undefined || record !== undefined;
}

/**
 * Drops local photo data that is deleted or no record refers to any more:
 * - blobs and file rows of tombstoned photos or records; a tombstoned file row's
 *   Drive file is queued for the trash, so a file uploaded before the deletion
 *   arrived is still trashed by whichever device sees it;
 * - blobs and file rows of records that are gone (removed by the tombstone merge);
 * - blobs a record no longer lists (removed in an edit on another device),
 * so none of them is ever uploaded again.
 */
async function cleanUpOrphans(): Promise<void> {
  await appDb.transaction(
    "rw",
    [appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash, appDb.tombstones],
    async () => {
      const records = await appDb.photoRecords.toArray();
      const photoIdsByRecord = new Map(records.map((r) => [r.id, new Set(r.photoIds)]));
      const blobs = await appDb.photoBlobs.toArray();
      const files = await appDb.photoFiles.toArray();

      const staleBlobIds: string[] = [];
      for (const b of blobs) {
        if (!photoIdsByRecord.get(b.recordId)?.has(b.id) || (await isTombstoned(b.id, b.recordId))) {
          staleBlobIds.push(b.id);
        }
      }
      const staleFileIds: string[] = [];
      const queuedAt = localIsoNow();
      for (const f of files) {
        if (await isTombstoned(f.id, f.recordId)) {
          staleFileIds.push(f.id);
          if (f.driveFileId) await appDb.photoTrash.put({ driveFileId: f.driveFileId, queuedAt });
        } else if (!photoIdsByRecord.has(f.recordId)) {
          staleFileIds.push(f.id);
        }
      }
      await appDb.photoBlobs.bulkDelete(staleBlobIds);
      await appDb.photoFiles.bulkDelete(staleFileIds);
    },
  );
}

/** Trashes every queued Drive file; only the ones that succeeded leave the queue. */
async function emptyTrashQueue(accessToken: string): Promise<string | undefined> {
  const queue = await appDb.photoTrash.toArray();
  let failed = 0;
  for (const item of queue) {
    if ((await trashDriveFile(accessToken, item.driveFileId)) === "ok") {
      await appDb.photoTrash.delete(item.driveFileId);
    } else {
      failed += 1;
    }
  }
  return failed > 0 ? `Failed to move ${failed} photo file(s) to the Drive trash` : undefined;
}

/** Local photos whose blob is here, that are not deleted and not on Drive yet. */
async function photosToUpload(): Promise<(PhotoBlob & { blob: Blob })[]> {
  const [blobs, uploaded] = await Promise.all([
    appDb.photoBlobs.toArray(),
    appDb.photoFiles.toCollection().primaryKeys(),
  ]);
  const done = new Set(uploaded);
  const pending: (PhotoBlob & { blob: Blob })[] = [];
  for (const b of blobs) {
    if (b.blob === null || done.has(b.id) || (await isTombstoned(b.id, b.recordId))) continue;
    pending.push(b as PhotoBlob & { blob: Blob });
  }
  return pending;
}

/**
 * Records the uploaded file in the file map. If the photo was removed or
 * tombstoned (or got a file row) while uploading, the new Drive file is queued
 * for the trash instead.
 */
async function recordUpload(photoId: string, driveFileId: string): Promise<boolean> {
  return appDb.transaction("rw", [appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash, appDb.tombstones], async () => {
    const [blob, file] = await Promise.all([appDb.photoBlobs.get(photoId), appDb.photoFiles.get(photoId)]);
    if (!blob || file || (await isTombstoned(photoId, blob.recordId))) {
      await appDb.photoTrash.put({ driveFileId, queuedAt: localIsoNow() });
      return false;
    }
    await appDb.photoFiles.add({ id: photoId, recordId: blob.recordId, driveFileId, updatedAt: localIsoNow() });
    return true;
  });
}

/** 1) 記録が無くなった写真の Blob と対応表を片付ける 2) ゴミ箱待ち行列を処理する 3) 設定 ON なら未アップロードの写真を上げて photoFiles に行を足す。 */
export async function syncPhotoFiles(accessToken: string): Promise<SyncTableResult> {
  const result: SyncTableResult = { tableName: TABLE_NAME, rowCount: 0 };
  const fail = (error: string) => {
    result.error ??= error;
  };

  try {
    await cleanUpOrphans();
    const trashError = await emptyTrashQueue(accessToken);
    if (trashError) fail(trashError);

    if (!readPhotoSyncEnabled()) return result;
    const pending = await photosToUpload();
    if (pending.length === 0) return result;

    const folderId = await findOrCreatePhotoFolder(accessToken);
    for (const photo of pending) {
      try {
        const driveFileId = await uploadPhoto(accessToken, folderId, photo.id, photo.blob);
        if (await recordUpload(photo.id, driveFileId)) result.rowCount += 1;
      } catch (err) {
        console.error("[sync] photo upload failed", photo.id, err);
        fail(message(err));
      }
    }
  } catch (err) {
    fail(message(err));
  }
  return result;
}
