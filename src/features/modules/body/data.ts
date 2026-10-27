import { createMeasurementRepository } from "@/features/measurements/measurement-repository";
import { appDb } from "@/features/storage/app-db";

/** Weight, body fat and height records; synced to the "BodyMeasurements" tab. */
export const bodyRepository = createMeasurementRepository(appDb.bodyRecords, "BodyMeasurements");
