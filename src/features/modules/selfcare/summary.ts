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
    const totalMinutes = item === "exercise" ? own.reduce((sum, r) => sum + (r.minutes ?? 0), 0) : null;
    items.push({ item, days, totalMinutes });
  }
  return { items };
}
