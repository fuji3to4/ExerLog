import { createMeasurementRepository } from "@/features/measurements/measurement-repository";
import { appDb } from "@/features/storage/app-db";

/** Arm and leg circumference records; synced to the "Circumference" tab. */
export const circumferenceRepository = createMeasurementRepository(appDb.circumferenceRecords, "Circumference");
