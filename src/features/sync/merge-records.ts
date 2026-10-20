export interface MergeRecordsArgs {
  local: any[];
  remote: any[];
  keyColumn: string;
  /** Field compared with Date.parse; null means local always wins a conflict. */
  updatedAtKey: string | null;
  /** Keys removed from the result regardless of which side holds them. */
  deletedIds: Set<string>;
}

/**
 * Last-writer-wins merge of local and remote records keyed by `keyColumn`.
 * Ties (and unparsable timestamps) keep the local record. Records present on
 * only one side are kept; keys in `deletedIds` are dropped from both sides.
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

  return [...merged].filter(([key]) => !deletedIds.has(key)).map(([, record]) => record);
}

function isNewer(candidate: any, current: any, updatedAtKey: string): boolean {
  return Date.parse(candidate[updatedAtKey]) > Date.parse(current[updatedAtKey]);
}
