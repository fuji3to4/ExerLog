import type { PhotoFile, PhotoRecord } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import { isWithinPeriod, periodDayKeys } from "../period";
import type { RecordModuleData } from "../types";
import { generatePhotosCsv } from "./csv";
import { syncPhotoFiles } from "./file-sync";
import {
  listAllPhotoRecords,
  listPhotoRecordsForDay,
  listPhotoRecordsInDayRange,
  PHOTO_FILES_TABLE,
  PHOTOS_TABLE,
} from "./repository";
import { photoFilesSyncConfig, photosSyncConfig } from "./sync-config";

export const photoData: RecordModuleData<PhotoRecord> = {
  id: "photo",
  syncConfigs: [photosSyncConfig, photoFilesSyncConfig],
  tables: () => [appDb.photoRecords, appDb.photoBlobs, appDb.photoFiles, appDb.photoTrash],
  listForDay: listPhotoRecordsForDay,
  async listInPeriod(period) {
    const { start, end } = periodDayKeys(period);
    const records = await listPhotoRecordsInDayRange(start, end);
    return records.filter((record) => isWithinPeriod(record.recordedAt, period));
  },
  async datesWithRecordsInMonth(month) {
    const records = await appDb.photoRecords.where("date").startsWith(month).toArray();
    return new Set(records.map((record) => record.date));
  },
  /**
   * Removes records, blobs and file rows, tombstones both tabs and queues every
   * known Drive file for the trash. The trash queue itself is kept.
   */
  async clearAll() {
    const records = await appDb.photoRecords.toArray();
    const blobIds = await appDb.photoBlobs.toCollection().primaryKeys();
    const files: PhotoFile[] = await appDb.photoFiles.toArray();
    const photoIds = [
      ...new Set([...records.flatMap((r) => r.photoIds), ...blobIds, ...files.map((f) => f.id)]),
    ];
    const queuedAt = localIsoNow();
    await appDb.photoRecords.clear();
    await appDb.photoBlobs.clear();
    await appDb.photoFiles.clear();
    await appDb.photoTrash.bulkPut(
      files.filter((f) => f.driveFileId).map((f) => ({ driveFileId: f.driveFileId, queuedAt })),
    );
    await recordTombstones(PHOTOS_TABLE, records.map((r) => r.id));
    await recordTombstones(PHOTO_FILES_TABLE, photoIds);
  },
  count: () => appDb.photoRecords.count(),
  csv: {
    fileName: "photos.csv",
    exportLabelKey: "settings_export_photos",
    generate: async () => generatePhotosCsv(await listAllPhotoRecords()),
  },
  syncFiles: syncPhotoFiles,
};
