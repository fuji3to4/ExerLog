/**
 * Orders `items` by `orderIds`: listed ids first, in that order (repeats keep the first
 * position, unknown ids are skipped); items missing from the order follow in input order,
 * so a newly added video shows up at the end instead of disappearing.
 */
export function applyOrder<T extends { id: string }>(items: readonly T[], orderIds: readonly string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  const placed = new Set<string>();
  for (const id of orderIds) {
    const item = byId.get(id);
    if (item && !placed.has(id)) {
      ordered.push(item);
      placed.add(id);
    }
  }
  return [...ordered, ...items.filter((item) => !placed.has(item.id))];
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
