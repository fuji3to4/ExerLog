import { useCallback, useEffect, useMemo, useState } from "react";

import { useSavedFlash } from "@/features/feedback/use-saved-flash";
import { calculateBmi } from "@/features/metrics/bmi";
import {
  findLatestHeightOnOrBefore,
  listDailyMetricsByDate,
  replaceDailyMetrics,
  type MetricDraft,
} from "@/features/storage/daily-metrics.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { MetricType } from "@/lib/types";

type MetricState = Record<MetricType, string>;

export type SelfCareEntryState = {
  isDone: boolean;
  count: string;
  minutes: string;
  note: string;
};

const EMPTY_METRICS: MetricState = {
  height: "",
  weight: "",
  bodyFat: "",
};

const METRIC_UNITS: Record<MetricType, string> = {
  height: "cm",
  weight: "kg",
  bodyFat: "%",
};

function toNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function useSelfCareData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [metrics, setMetrics] = useState<MetricState>(EMPTY_METRICS);
  const [storedHeight, setStoredHeight] = useState<number | null>(null);
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);
  const [hasSaveError, setHasSaveError] = useState(false);
  const { isSaved, flash } = useSavedFlash();

  useEffect(() => {
    let isActive = true;
    setHydratedDayKey(null);
    setHasSaveError(false);

    async function loadSelfCareData() {
      const [savedMetrics, latestHeight] = await Promise.all([
        listDailyMetricsByDate(dayKey),
        findLatestHeightOnOrBefore(dayKey),
      ]);

      if (!isActive) {
        return;
      }

      const nextMetrics: MetricState = { ...EMPTY_METRICS };
      savedMetrics.forEach((metric) => {
        nextMetrics[metric.metricType] = String(metric.value);
      });
      setMetrics(nextMetrics);
      setStoredHeight(latestHeight);
      setHydratedDayKey(dayKey);
    }

    void loadSelfCareData();

    return () => {
      isActive = false;
    };
  }, [dayKey]);

  const setMetric = useCallback((metricType: MetricType, value: string) => {
    setMetrics((currentMetrics) => ({
      ...currentMetrics,
      [metricType]: value,
    }));
  }, []);

  const bmi = useMemo(() => {
    const weight = toNullableNumber(metrics.weight);
    const height = metrics.height.trim() !== "" ? toNullableNumber(metrics.height) : storedHeight;

    if (weight === null || height === null) {
      return null;
    }

    return calculateBmi(weight, height);
  }, [metrics.height, metrics.weight, storedHeight]);

  const save = useCallback(async () => {
    const metricDrafts = (Object.keys(metrics) as MetricType[]).reduce<MetricDraft[]>((drafts, metricType) => {
      const value = toNullableNumber(metrics[metricType]);

      if (value === null) {
        return drafts;
      }

      drafts.push({
        metricType,
        value,
        unit: METRIC_UNITS[metricType],
      });
      return drafts;
    }, []);

    try {
      await replaceDailyMetrics(dayKey, metricDrafts);
    } catch {
      setHasSaveError(true);
      return;
    }

    // A height saved just now becomes the BMI fallback once the height field is cleared.
    try {
      setStoredHeight(await findLatestHeightOnOrBefore(dayKey));
    } catch {
      // Keep the previous fallback; the save itself succeeded.
    }

    setHasSaveError(false);
    flash();
  }, [dayKey, flash, metrics]);

  return {
    dayKey,
    isHydrated: hydratedDayKey === dayKey,
    metrics,
    bmi,
    setMetric,
    save,
    isSaved,
    hasSaveError,
  };
}
