import type { PhotoBlob } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import type { SyncTableResult } from "@/features/sync/sync-engine";
import { findOrCreatePhotoFolder, trashDriveFile, uploadPhoto } from "./drive";
import { readPhotoSyncEnabled } from "./photo-sync-setting";

const TABLE_NAME = "PhotoDrive";

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Drops local photo data that no record refers to any more: blobs and file rows
 * of records that are gone (e.g. deleted on another device and removed by the
 * tombstone merge), and blobs a record no longer lists (removed in an edit on
 * another device), so they are never uploaded again. The deleting device
 * trashes the Drive files; this one only cleans up locally.
 */
async function cleanUpOrphans(): Promise<void> {
  await appDb.transaction("rw", appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, async () => {
    const records = await appDb.photoRecords.toArray();
    const photoIdsByRecord = new Map(records.map((r) => [r.id, new Set(r.photoIds)]));
    const blobs = await appDb.photoBlobs.toArray();
    const files = await appDb.photoFiles.toArray();
    await appDb.photoBlobs.bulkDelete(
      blobs.filter((b) => !photoIdsByRecord.get(b.recordId)?.has(b.id)).map((b) => b.id),
    );
    await appDb.photoFiles.bulkDelete(
      files.filter((f) => !photoIdsByRecord.has(f.recordId)).map((f) => f.id),
    );
  });
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

/** Local photos whose blob is here but that are not on Drive yet. */
async function photosToUpload(): Promise<(PhotoBlob & { blob: Blob })[]> {
  const [blobs, uploaded] = await Promise.all([
    appDb.photoBlobs.toArray(),
    appDb.photoFiles.toCollection().primaryKeys(),
  ]);
  const done = new Set(uploaded);
  return blobs.filter((b): b is PhotoBlob & { blob: Blob } => b.blob !== null && !done.has(b.id));
}

/**
 * Records the uploaded file in the file map. If the photo was removed (or got a
 * file row) while uploading, the new Drive file is queued for the trash instead.
 */
async function recordUpload(photoId: string, driveFileId: string): Promise<boolean> {
  return appDb.transaction("rw", appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash, async () => {
    const [blob, file] = await Promise.all([appDb.photoBlobs.get(photoId), appDb.photoFiles.get(photoId)]);
    if (!blob || file) {
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
