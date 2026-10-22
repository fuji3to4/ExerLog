import type { MeasurementRecord } from "@/lib/types";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

export const MEASUREMENTS_TABLE = "Measurements";

export type AddMeasurementInput = {
  date: string;
  values: Record<string, number>;
  note: string;
  recordedAt?: string;
};

export async function addMeasurement(input: AddMeasurementInput): Promise<MeasurementRecord> {
  if (Object.keys(input.values).length === 0) {
    throw new Error("empty measurement");
  }
  const record: MeasurementRecord = {
    id: crypto.randomUUID(),
    date: input.date,
    recordedAt: input.recordedAt ?? localIsoAt(input.date),
    values: { ...input.values },
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.measurements.add(record);
  scheduleSync();
  return record;
}

/** Saves `values` as given: the caller must pass values of items not shown in the UI too. */
export async function updateMeasurement(record: MeasurementRecord): Promise<void> {
  await appDb.measurements.put({ ...record, note: record.note.trim(), updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteMeasurement(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.measurements, appDb.tombstones, async () => {
    await appDb.measurements.delete(id);
    await recordTombstones(MEASUREMENTS_TABLE, [id]);
  });
  scheduleSync();
}

/** Records for the day, oldest first. */
export function listMeasurementsForDay(date: string): Promise<MeasurementRecord[]> {
  return appDb.measurements.where("date").equals(date).sortBy("recordedAt");
}

/** Records whose date is within [start, end] (inclusive day keys), oldest first. */
export function listMeasurementsInRange(start: string, end: string): Promise<MeasurementRecord[]> {
  return appDb.measurements.where("date").between(start, end, true, true).sortBy("recordedAt");
}

export type MeasurementLookupOptions = {
  /** Ignore this record (the one being edited). */
  excludeId?: string;
};

/** Per item, the newest value recorded strictly before `at`. */
export async function findPreviousValues(
  at: string,
  options: MeasurementLookupOptions = {},
): Promise<Record<string, number>> {
  const earlier = await appDb.measurements.where("recordedAt").below(at).toArray();
  return mergeOldestFirst(withoutId(earlier, options.excludeId));
}

/** Newest height recorded at or before `at`, or null. */
export async function findLatestHeightAt(
  at: string,
  options: MeasurementLookupOptions = {},
): Promise<number | null> {
  const upTo = await appDb.measurements.where("recordedAt").belowOrEqual(at).toArray();
  return mergeOldestFirst(withoutId(upTo, options.excludeId)).height ?? null;
}

function withoutId(records: MeasurementRecord[], id: string | undefined): MeasurementRecord[] {
  return id === undefined ? records : records.filter((record) => record.id !== id);
}

function mergeOldestFirst(records: MeasurementRecord[]): Record<string, number> {
  const sorted = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const result: Record<string, number> = {};
  for (const record of sorted) {
    Object.assign(result, record.values);
  }
  return result;
}
