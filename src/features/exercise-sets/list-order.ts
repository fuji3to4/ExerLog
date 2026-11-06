/**
 * Orders `items` by `orderKeys`: listed keys first, in that order (repeats keep the first
 * position, unknown keys are skipped); items missing from the order follow in input order,
 * so a newly added video shows up at the end instead of disappearing. `keyOf` names an item
 * (its id by default; a list entry's key for lists that can repeat a video).
 */
export function applyOrder<T extends { id: string }>(
  items: readonly T[],
  orderKeys: readonly string[],
  keyOf: (item: T) => string = (item) => item.id,
): T[] {
  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const ordered: T[] = [];
  const placed = new Set<string>();
  for (const key of orderKeys) {
    const item = byKey.get(key);
    if (item && !placed.has(key)) {
      ordered.push(item);
      placed.add(key);
    }
  }
  return [...ordered, ...items.filter((item) => !placed.has(keyOf(item)))];
}

/** A random permutation of `ids` (Fisher–Yates). `first`, when present, is put at the front. */
export function shuffleIds(
  ids: readonly string[],
  options: { first?: string; random?: () => number } = {},
): string[] {
  const { first, random = Math.random } = options;
  const hasFirst = first !== undefined && ids.includes(first);
  const rest = hasFirst ? ids.filter((id) => id !== first) : [...ids];
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return hasFirst ? [first, ...rest] : rest;
}
