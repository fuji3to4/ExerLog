export const MODULE_TAGS = ["lymphedema"] as const;

export type ModuleTag = (typeof MODULE_TAGS)[number];

function isModuleTag(value: string): value is ModuleTag {
  return (MODULE_TAGS as readonly string[]).includes(value);
}

/** Loose parse of a comma-separated tag list. Unknown values are ignored. */
export function parseModuleTags(raw: string | undefined): ReadonlySet<ModuleTag> {
  const tags = new Set<ModuleTag>();
  for (const part of (raw ?? "").split(",")) {
    const tag = part.trim().toLowerCase();
    if (isModuleTag(tag)) tags.add(tag);
  }
  return tags;
}

/**
 * Read at call time (not module load) so tests can use vi.stubEnv.
 * The literal property access lets Next.js inline the value at build time.
 */
export function defaultOnModuleTags(): ReadonlySet<ModuleTag> {
  return parseModuleTags(process.env.NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS);
}

/** Ids of tagged modules where none of the tags is on by default, in input order. */
export function defaultOffModuleIds(
  modules: readonly { data: { id: string }; tags?: readonly ModuleTag[] }[],
  onTags: ReadonlySet<ModuleTag>,
): string[] {
  return modules
    .filter((m) => (m.tags?.length ?? 0) > 0 && !m.tags?.some((t) => onTags.has(t)))
    .map((m) => m.data.id);
}
