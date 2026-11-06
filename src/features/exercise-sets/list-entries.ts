import type { ExerciseVideo } from "@/lib/types";

/**
 * One position in a shown list. A my-list may hold the same video more than once, so a position is
 * named by its entry key: the first occurrence keeps the plain exercise id, later ones get `<id>#<n>`
 * (n = 2, 3, …). Plain ids stay valid keys, so orders stored before repeats existed keep working.
 */
export type ListEntry = ExerciseVideo & { entryKey: string };

/** Entry keys for a raw id list, counted over every id (including ones missing from the library). */
export function toEntryKeys(ids: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    const count = (seen.get(id) ?? 0) + 1;
    seen.set(id, count);
    return count === 1 ? id : `${id}#${count}`;
  });
}

/** The exercise id an entry key points at (exercise ids never contain "#"). */
export function exerciseIdOfEntry(entryKey: string): string {
  return entryKey.replace(/#\d+$/, "");
}

/** A list where every video appears once (すべて, recommendations): each key is the id. */
export function asEntries(exercises: readonly ExerciseVideo[]): ListEntry[] {
  return exercises.map((exercise) => ({ ...exercise, entryKey: exercise.id }));
}

export const entryKeyOf = (entry: ListEntry): string => entry.entryKey;
