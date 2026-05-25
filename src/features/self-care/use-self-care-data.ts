import { useCallback, useEffect, useMemo, useState } from "react";

import { listDailyMetricsByDate, replaceDailyMetrics, type MetricDraft } from "@/features/storage/daily-metrics.repository";
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { MetricType, WellnessScore } from "@/lib/types";

type MetricState = Record<MetricType, string>;

export type SelfCareEntryState = {
  isDone: boolean;
  count: string;
  minutes: string;
  note: string;
};

const DEFAULT_WELLNESS_SCORE: WellnessScore = 3;

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

function toWellnessScore(value: number): WellnessScore {
  const roundedValue = Math.round(value);

  if (roundedValue <= 1) {
    return 1;
  }

  if (roundedValue >= 5) {
    return 5;
  }

  return roundedValue as WellnessScore;
}

export function useSelfCareData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [physicalScore, setPhysicalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [mentalScore, setMentalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [note, setNote] = useState("");
  const [metrics, setMetrics] = useState<MetricState>(EMPTY_METRICS);
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setHydratedDayKey(null);

    async function loadSelfCareData() {
      const selectedDayKey = toDayKey(dayKey);
      const [savedWellness, savedMetrics] = await Promise.all([
        getDailyWellness(selectedDayKey),
        listDailyMetricsByDate(selectedDayKey),
      ]);

      if (!isActive) {
        return;
      }

      const nextMetrics: MetricState = { ...EMPTY_METRICS };
      savedMetrics.forEach((metric) => {
        nextMetrics[metric.metricType] = String(metric.value);
      });
      setPhysicalScoreState(savedWellness?.physicalScore ?? DEFAULT_WELLNESS_SCORE);
      setMentalScoreState(savedWellness?.mentalScore ?? DEFAULT_WELLNESS_SCORE);
      setNote(savedWellness?.note ?? "");
      setMetrics(nextMetrics);
      setHydratedDayKey(selectedDayKey);
    }

    void loadSelfCareData();

    return () => {
      isActive = false;
    };
  }, [dayKey]);

  const setPhysicalScore = useCallback((value: number) => {
    setPhysicalScoreState(toWellnessScore(value));
  }, []);

  const setMentalScore = useCallback((value: number) => {
    setMentalScoreState(toWellnessScore(value));
  }, []);

  const setMetric = useCallback((metricType: MetricType, value: string) => {
    setMetrics((currentMetrics) => ({
      ...currentMetrics,
      [metricType]: value,
    }));
  }, []);

  const save = useCallback(async () => {
    const selectedDayKey = toDayKey(dayKey);
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

    await Promise.all([
      saveDailyWellness({
        date: selectedDayKey,
        physicalScore,
        mentalScore,
        note,
      }),
      replaceDailyMetrics(selectedDayKey, metricDrafts),
    ]);
  }, [dayKey, mentalScore, metrics, note, physicalScore]);

  return {
    dayKey,
    isHydrated: hydratedDayKey === dayKey,
    physicalScore,
    mentalScore,
    note,
    metrics,
    setPhysicalScore,
    setMentalScore,
    setNote,
    setMetric,
    save,
  };
}
