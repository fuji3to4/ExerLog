import type { ListOrder } from "@/lib/types";

import { localIsoNow } from "@/lib/date/local-iso";
import { scheduleSync } from "@/features/sync/auto-sync";
import { appDb } from "./app-db";

/** The record that holds the whole library's ("すべて") saved order. */
export const LIBRARY_ORDER_ID = "all";

/** The saved library order; [] when the user never reordered (catalog order applies). */
export async function getLibraryOrder(): Promise<string[]> {
  return (await appDb.listOrders.get(LIBRARY_ORDER_ID))?.exerciseIds ?? [];
}

/** Written only by the reorder UI; shuffle and sort never touch it. */
export async function saveLibraryOrder(exerciseIds: string[]): Promise<void> {
  const order: ListOrder = { id: LIBRARY_ORDER_ID, exerciseIds: [...exerciseIds], updatedAt: localIsoNow() };
  await appDb.listOrders.put(order);
  scheduleSync();
}
