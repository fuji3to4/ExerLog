import { GIRTH_ITEMS } from "@/features/measurements/measurement-items";
import { createMeasurementRepository } from "@/features/measurements/measurement-repository";
import { appDb } from "@/features/storage/app-db";
import { createMeasurementModuleData } from "../measurement-data";

/** Chest and waist girth records; synced to the "Girth" tab. */
export const girthRepository = createMeasurementRepository(appDb.girthRecords, "Girth");

export const girthData = createMeasurementModuleData({
  id: "girth",
  repository: girthRepository,
  items: GIRTH_ITEMS,
  csv: { fileName: "girth.csv", exportLabelKey: "settings_export_girth" },
});
