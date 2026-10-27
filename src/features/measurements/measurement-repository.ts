import type { Table } from "dexie";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "@/features/storage/app-db";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import type { MeasurementRecord } from "@/lib/types";

export type AddMeasurementInput = {
  date: string;
  values: Record<string, number>;
  note: string;
  recordedAt?: string;
};

export type MeasurementLookupOptions = {
  /** Ignore this record (the one being edited). */
  excludeId?: string;
};

/** Timed records of one measurement table (body or circumference). */
export type MeasurementRepository = {
  /** Throws on empty `values`. A missing `recordedAt` defaults to now on `date`. */
  add(input: AddMeasurementInput): Promise<MeasurementRecord>;
  /** Saves `values` as given: the caller must pass values of items not shown in the UI too. */
  update(record: MeasurementRecord): Promise<void>;
  /** Deletes the record and records a tombstone named `tombstoneTable`. */
  remove(id: string): Promise<void>;
  /** Records for the day, oldest first. */
  listForDay(date: string): Promise<MeasurementRecord[]>;
  /** Records whose date is within [start, end] (inclusive day keys), oldest first. */
  listInDayRange(start: string, end: string): Promise<MeasurementRecord[]>;
  /** Per item, the newest value recorded strictly before `at`. */
  findPreviousValues(at: string, options?: MeasurementLookupOptions): Promise<Record<string, number>>;
  /** Newest value of `itemId` recorded at or before `at`, or null. */
  findLatestValueAt(itemId: string, at: string, options?: MeasurementLookupOptions): Promise<number | null>;
  table: Table<MeasurementRecord, string>;
  /** Sheet tab name, also used as the tombstone `table`. */
  tombstoneTable: string;
};

export function createMeasurementRepository(
  table: Table<MeasurementRecord, string>,
  tombstoneTable: string,
): MeasurementRepository {
  /** Records accepted by `keep(instant)`, minus the excluded one, oldest first. */
  async function recordsWhere(
    keep: (time: number) => boolean,
    excludeId: string | undefined,
  ): Promise<MeasurementRecord[]> {
    const all = await table.toArray();
    return sortOldestFirst(all.filter((record) => record.id !== excludeId && keep(Date.parse(record.recordedAt))));
  }

  return {
    table,
    tombstoneTable,

    async add(input) {
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
      await table.add(record);
      scheduleSync();
      return record;
    },

    async update(record) {
      await table.put({ ...record, note: record.note.trim(), updatedAt: localIsoNow() });
      scheduleSync();
    },

    async remove(id) {
      await appDb.transaction("rw", table, appDb.tombstones, async () => {
        await table.delete(id);
        await recordTombstones(tombstoneTable, [id]);
      });
      scheduleSync();
    },

    async listForDay(date) {
      return sortOldestFirst(await table.where("date").equals(date).toArray());
    },

    async listInDayRange(start, end) {
      return sortOldestFirst(await table.where("date").between(start, end, true, true).toArray());
    },

    async findPreviousValues(at, options = {}) {
      const limit = Date.parse(at);
      const earlier = await recordsWhere((time) => time < limit, options.excludeId);
      const result: Record<string, number> = {};
      for (const record of earlier) {
        Object.assign(result, record.values);
      }
      return result;
    },

    async findLatestValueAt(itemId, at, options = {}) {
      const limit = Date.parse(at);
      const upTo = await recordsWhere((time) => time <= limit, options.excludeId);
      for (let index = upTo.length - 1; index >= 0; index--) {
        const value = upTo[index]!.values[itemId];
        if (value !== undefined) return value;
      }
      return null;
    },
  };
}

/** Oldest instant first; compares parsed instants so differing offsets order correctly. */
function sortOldestFirst(records: MeasurementRecord[]): MeasurementRecord[] {
  return records.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
