import type { SelfCareItemId, SelfCareRecord } from "@/lib/types";

import { SELF_CARE_ITEMS } from "./data";

export type SelfCareSummary = {
  items: { item: SelfCareItemId; days: number; totalMinutes: number | null }[];
};

export function summarizeSelfCare(records: SelfCareRecord[]): SelfCareSummary | null {
  if (records.length === 0) return null;
  const items: SelfCareSummary["items"] = [];
  for (const item of SELF_CARE_ITEMS) {
    const own = records.filter((r) => r.item === item);
    const days = new Set(own.map((r) => r.date)).size;
    if (days === 0) continue;
    // Null when no exercise record has minutes, so a total of 0 is never shown.
    const withMinutes = item === "exercise" ? own.filter((r) => r.minutes !== null) : [];
    const totalMinutes = withMinutes.length > 0 ? withMinutes.reduce((sum, r) => sum + (r.minutes ?? 0), 0) : null;
    items.push({ item, days, totalMinutes });
  }
  return { items };
}
