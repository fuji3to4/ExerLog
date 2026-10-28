import type { Table } from "dexie";

export function cell(row: string[], headers: string[], column: string): string {
  return row[headers.indexOf(column)] ?? "";
}

export function nullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export async function replaceTable<T>(table: Table<T, any>, records: T[]): Promise<void> {
  await table.clear();
  if (records.length > 0) {
    await table.bulkPut(records);
  }
}

/**
 * Keeps one record per `uniqueKey` (the latest by `timeKey`) so that a merge of
 * two devices' records cannot violate a compound unique index.
 */
export function keepLatestPerKey<T extends Record<string, any>>(
  records: T[],
  uniqueKey: (record: T) => string,
  timeKey: keyof T,
): T[] {
  const byKey = new Map<string, T>();
  for (const record of records) {
    const key = uniqueKey(record);
    const current = byKey.get(key);
    if (!current || Date.parse(record[timeKey]) > Date.parse(current[timeKey])) {
      byKey.set(key, record);
    }
  }
  return [...byKey.values()];
}
