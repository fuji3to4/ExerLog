import type { PhotoFile, PhotoRecord } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import type { TableSyncConfig } from "@/features/sync/sync-config";
import { cell, replaceTable } from "@/features/sync/sync-helpers";
import { PHOTO_FILES_TABLE, PHOTOS_TABLE } from "./repository";

/** The photoIds cell holds a JSON array; anything else reads as no photos. */
function parsePhotoIds(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export const photosSyncConfig: TableSyncConfig = {
  tabName: PHOTOS_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "date", "recordedAt", "note", "photoIds", "updatedAt"],
  toRow: (r: PhotoRecord) => [r.id, r.date, r.recordedAt, r.note ?? "", JSON.stringify(r.photoIds), r.updatedAt],
  fromRow: (row, headers): PhotoRecord => ({
    id: cell(row, headers, "id"),
    date: cell(row, headers, "date"),
    recordedAt: cell(row, headers, "recordedAt"),
    note: cell(row, headers, "note"),
    photoIds: parsePhotoIds(cell(row, headers, "photoIds")),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.photoRecords.toArray(),
  replaceDb: (records) => replaceTable(appDb.photoRecords, records as PhotoRecord[]),
};

export const photoFilesSyncConfig: TableSyncConfig = {
  tabName: PHOTO_FILES_TABLE,
  keyColumn: "id",
  updatedAtKey: "updatedAt",
  deletable: true,
  headers: ["id", "recordId", "driveFileId", "updatedAt"],
  toRow: (r: PhotoFile) => [r.id, r.recordId, r.driveFileId, r.updatedAt],
  fromRow: (row, headers): PhotoFile => ({
    id: cell(row, headers, "id"),
    recordId: cell(row, headers, "recordId"),
    driveFileId: cell(row, headers, "driveFileId"),
    updatedAt: cell(row, headers, "updatedAt"),
  }),
  readFromDb: () => appDb.photoFiles.toArray(),
  replaceDb: (records) => replaceTable(appDb.photoFiles, records as PhotoFile[]),
  /**
   * Rows of deleted photos this device never held: the device that deleted them may
   * not have known their Drive file, so queue each file for the trash here.
   */
  onTombstonedRemote: async (records) => {
    const queuedAt = localIsoNow();
    await appDb.photoTrash.bulkPut(
      (records as PhotoFile[])
        .filter((file) => file.driveFileId)
        .map((file) => ({ driveFileId: file.driveFileId, queuedAt })),
    );
  },
};
