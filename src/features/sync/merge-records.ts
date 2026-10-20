export interface MergeRecordsArgs {
  local: any[];
  remote: any[];
  keyColumn: string;
  /** Field compared with Date.parse; null means local always wins a conflict. */
  updatedAtKey: string | null;
  /**
   * Tombstoned keys → their deletedAt. A tombstoned record is dropped unless
   * its `updatedAtKey` timestamp is later than deletedAt (re-created after the
   * deletion); records without a usable timestamp are always dropped.
   */
  deletedIds: Map<string, string>;
}

/**
 * Last-writer-wins merge of local and remote records keyed by `keyColumn`.
 * Ties (and unparsable timestamps) keep the local record. Records present on
 * only one side are kept. Tombstones are applied to the merged winner, on
 * either side, as described on `deletedIds`.
 */
export function mergeRecords({
  local,
  remote,
  keyColumn,
  updatedAtKey,
  deletedIds,
}: MergeRecordsArgs): any[] {
  const merged = new Map<string, any>();

  for (const record of local) {
    merged.set(String(record[keyColumn]), record);
  }

  for (const record of remote) {
    const key = String(record[keyColumn]);
    const current = merged.get(key);
    if (current === undefined || (updatedAtKey !== null && isNewer(record, current, updatedAtKey))) {
      merged.set(key, record);
    }
  }

  return [...merged]
    .filter(([key, record]) => {
      const deletedAt = deletedIds.get(key);
      return deletedAt === undefined || updatedAfter(record, deletedAt, updatedAtKey);
    })
    .map(([, record]) => record);
}

function updatedAfter(record: any, deletedAt: string, updatedAtKey: string | null): boolean {
  if (updatedAtKey === null) return false;
  const updatedAt = Date.parse(record[updatedAtKey]);
  if (Number.isNaN(updatedAt)) return false;
  return updatedAt > Date.parse(deletedAt);
}

function isNewer(candidate: any, current: any, updatedAtKey: string): boolean {
  return Date.parse(candidate[updatedAtKey]) > Date.parse(current[updatedAtKey]);
}
