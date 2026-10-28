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
