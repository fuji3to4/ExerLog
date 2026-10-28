import type { Language } from "@/features/i18n/language";
import type { CompressionKind, CompressionRecord } from "@/lib/types";

// Kept local (not imported from data.ts) so data.ts can use wearMinutes without a cycle.
const KINDS: readonly CompressionKind[] = ["garment", "bandage"];

/** Wear time in whole minutes, or null while still worn (or on unparsable timestamps). */
export function wearMinutes(record: CompressionRecord): number | null {
  if (record.endedAt === null) return null;
  const diff = Date.parse(record.endedAt) - Date.parse(record.recordedAt);
  if (Number.isNaN(diff)) return null;
  return Math.round(diff / 60000);
}

export type CompressionSummary = {
  kinds: { kind: CompressionKind; days: number; averageMinutes: number | null }[];
};

export function summarizeCompression(records: CompressionRecord[]): CompressionSummary | null {
  if (records.length === 0) return null;
  const kinds: CompressionSummary["kinds"] = [];
  for (const kind of KINDS) {
    const own = records.filter((r) => r.kind === kind);
    const days = new Set(own.map((r) => r.date)).size;
    if (days === 0) continue;
    let total = 0;
    const measuredDays = new Set<string>();
    for (const r of own) {
      const minutes = wearMinutes(r);
      if (minutes === null) continue;
      total += minutes;
      measuredDays.add(r.date);
    }
    kinds.push({
      kind,
      days,
      averageMinutes: measuredDays.size === 0 ? null : Math.round(total / measuredDays.size),
    });
  }
  return { kinds };
}

/** Per-day total wear in hours (1 decimal), finished records only, oldest day first. */
export function dailyWearHours(records: CompressionRecord[], kind: CompressionKind): { date: string; hours: number }[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    if (r.kind !== kind) continue;
    const minutes = wearMinutes(r);
    if (minutes === null) continue;
    totals.set(r.date, (totals.get(r.date) ?? 0) + minutes);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, minutes]) => ({ date, hours: Math.round(minutes / 6) / 10 }));
}

export function formatWearMinutes(minutes: number, language: Language): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (language === "ja") {
    if (h === 0) return `${m}分`;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
  }
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
