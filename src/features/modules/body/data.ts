import { BODY_ITEMS } from "@/features/measurements/measurement-items";
import { createMeasurementRepository } from "@/features/measurements/measurement-repository";
import { appDb } from "@/features/storage/app-db";
import { createMeasurementModuleData } from "../measurement-data";

/** Weight, body fat and height records; synced to the "BodyMeasurements" tab. */
export const bodyRepository = createMeasurementRepository(appDb.bodyRecords, "BodyMeasurements");

export const bodyData = createMeasurementModuleData({
  id: "body",
  repository: bodyRepository,
  items: BODY_ITEMS,
  csv: { fileName: "body.csv", exportLabelKey: "settings_export_body" },
});
