import type { Messages } from "@/features/i18n/messages";
import type { MeasurementItem } from "@/features/measurements/measurement-items";
import type { MeasurementRepository } from "@/features/measurements/measurement-repository";
import { createMeasurementSyncConfig } from "@/features/measurements/measurement-sync";
import { generateMeasurementsCsv } from "@/features/settings/csv/history-csv";
import { recordTombstones } from "@/features/storage/tombstones.repository";
import type { MeasurementRecord } from "@/lib/types";
import { isWithinPeriod, periodDayKeys } from "./period";
import type { RecordModuleData } from "./types";

/** Data-layer module over one measurement table (shared by body and circumference). */
export function createMeasurementModuleData({
  id,
  repository,
  items,
  csv,
}: {
  id: string;
  repository: MeasurementRepository;
  items: readonly MeasurementItem[];
  csv: { fileName: string; exportLabelKey: keyof Messages };
}): RecordModuleData<MeasurementRecord> {
  const { table, tombstoneTable } = repository;
  return {
    id,
    syncConfigs: [createMeasurementSyncConfig({ tabName: tombstoneTable, items, repository })],
    tables: () => [table],
    listForDay: (date) => repository.listForDay(date),
    async listInPeriod(period) {
      const { start, end } = periodDayKeys(period);
      const records = await repository.listInDayRange(start, end);
      return records.filter((record) => isWithinPeriod(record.recordedAt, period));
    },
    async datesWithRecordsInMonth(month) {
      const records = await table.where("date").startsWith(month).toArray();
      return new Set(records.map((record) => record.date));
    },
    async clearAll() {
      const ids = await table.toCollection().primaryKeys();
      await table.clear();
      await recordTombstones(tombstoneTable, ids);
    },
    count: () => table.count(),
    csv: {
      ...csv,
      generate: async () => generateMeasurementsCsv(await repository.listAll(), items),
    },
  };
}
