import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import type { SelfCareItem } from "@/lib/types";

import { appDb } from "./app-db";

export async function seedSelfCareCatalogIfEmpty(): Promise<void> {
  const count = await appDb.selfCareCatalog.count();
  if (count === 0) {
    await appDb.selfCareCatalog.bulkAdd(selfCareCatalog);
  }
}

export async function listAllSelfCareItems(): Promise<SelfCareItem[]> {
  await seedSelfCareCatalogIfEmpty();
  return appDb.selfCareCatalog.orderBy("sortOrder").toArray();
}
