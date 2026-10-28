"use client";

import { useEffect, useState, type ReactNode } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { Period } from "../period";

/** Frame shared by every card of the period summary. */
export function SummaryCardFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1 rounded-2xl border border-border p-3 text-sm">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Body of a card whose summary is `null` (nothing recorded in the period). */
export function SummaryEmpty() {
  const { t } = useTranslation();
  return <p className="text-muted-foreground">{t("period_no_records")}</p>;
}

type Loaded<T> = { key: string; value: T } | null;

/**
 * Runs `load` whenever the period changes; undefined while loading. If `load` rejects, the
 * error is logged and `fallback` (the "nothing recorded" value) is returned instead.
 */
export function usePeriodSummary<T>(
  period: Period,
  load: (period: Period) => Promise<T>,
  fallback: T,
): T | undefined {
  const key = `${period.start}|${period.end}`;
  const [loaded, setLoaded] = useState<Loaded<T>>(null);

  useEffect(() => {
    let cancelled = false;
    load({ start: period.start, end: period.end })
      .catch((error: unknown) => {
        console.error("Failed to load period summary", error);
        return fallback;
      })
      .then((value) => {
        if (!cancelled) setLoaded({ key, value });
      });
    return () => {
      cancelled = true;
    };
    // `load` and `fallback` are stable module-level values in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return loaded?.key === key ? loaded.value : undefined;
}
