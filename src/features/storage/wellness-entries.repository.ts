import type { WellnessEntry } from "@/lib/types";

import { localIsoAt, localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";
import { recordTombstones } from "./tombstones.repository";

const TOMBSTONE_TABLE = "WellnessEntries";

export type AddWellnessEntryInput = Pick<
  WellnessEntry,
  "date" | "physicalScore" | "mentalScore" | "note"
> & { recordedAt?: string };

export async function addWellnessEntry(input: AddWellnessEntryInput): Promise<WellnessEntry> {
  const entry: WellnessEntry = {
    id: crypto.randomUUID(),
    date: input.date,
    recordedAt: input.recordedAt ?? localIsoAt(input.date),
    physicalScore: input.physicalScore,
    mentalScore: input.mentalScore,
    note: input.note.trim(),
    updatedAt: localIsoNow(),
  };
  await appDb.wellnessEntries.add(entry);
  scheduleSync();
  return entry;
}

export async function updateWellnessEntry(entry: WellnessEntry): Promise<void> {
  await appDb.wellnessEntries.put({ ...entry, note: entry.note.trim(), updatedAt: localIsoNow() });
  scheduleSync();
}

export async function deleteWellnessEntry(id: string): Promise<void> {
  await appDb.transaction("rw", appDb.wellnessEntries, appDb.tombstones, async () => {
    await appDb.wellnessEntries.delete(id);
    await recordTombstones(TOMBSTONE_TABLE, [id]);
  });
  scheduleSync();
}

/** Entries for the day, oldest first. */
export function listWellnessEntriesForDay(date: string): Promise<WellnessEntry[]> {
  return appDb.wellnessEntries.where("date").equals(date).sortBy("recordedAt");
}

export async function getLatestWellnessEntry(date: string): Promise<WellnessEntry | undefined> {
  const entries = await listWellnessEntriesForDay(date);
  return entries.at(-1);
}

/** Entries whose date is within [start, end] (inclusive day keys), oldest first. */
export function listWellnessEntriesInRange(start: string, end: string): Promise<WellnessEntry[]> {
  return appDb.wellnessEntries.where("date").between(start, end, true, true).sortBy("recordedAt");
}
