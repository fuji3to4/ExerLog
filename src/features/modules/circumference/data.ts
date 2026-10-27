import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import { createMeasurementRepository } from "@/features/measurements/measurement-repository";
import { appDb } from "@/features/storage/app-db";
import { createMeasurementModuleData } from "../measurement-data";

/** Arm and leg circumference records; synced to the "Circumference" tab. */
export const circumferenceRepository = createMeasurementRepository(appDb.circumferenceRecords, "Circumference");

export const circumferenceData = createMeasurementModuleData({
  id: "circumference",
  repository: circumferenceRepository,
  items: CIRCUMFERENCE_ITEMS,
  csv: { fileName: "circumference.csv", exportLabelKey: "settings_export_circumference" },
});
