import { useCallback, useEffect, useMemo, useState } from "react";

import { listAllSelfCareItems } from "@/features/storage/self-care-catalog.repository";
import { listDailyMetricsByDate, replaceDailyMetrics, type MetricDraft } from "@/features/storage/daily-metrics.repository";
import {
  listDailySelfCareEntriesByDate,
  replaceDailySelfCareEntries,
  type SelfCareDraft,
} from "@/features/storage/daily-self-care.repository";
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { toDayKey } from "@/lib/date/day-key";
import type { MetricType, SelfCareItem, WellnessScore } from "@/lib/types";

type MetricState = Record<MetricType, string>;

export type SelfCareEntryState = {
  isDone: boolean;
  count: string;
  minutes: string;
  note: string;
};

type SelfCareEntryMap = Record<string, SelfCareEntryState>;

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

function createEmptySelfCareEntry(): SelfCareEntryState {
  return {
    isDone: false,
    count: "",
    minutes: "",
    note: "",
  };
}

function toInputNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toWellnessScore(value: number): WellnessScore {
  if (value <= 1) {
    return 1;
  }

  if (value >= 5) {
    return 5;
  }

  return value as WellnessScore;
}

export function useSelfCareData(date: Date | string) {
  const dayKey = useMemo(() => toDayKey(date), [date]);
  const [physicalScore, setPhysicalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [mentalScore, setMentalScoreState] = useState<WellnessScore>(DEFAULT_WELLNESS_SCORE);
  const [note, setNote] = useState("");
  const [metrics, setMetrics] = useState<MetricState>(EMPTY_METRICS);
  const [selfCareItems, setSelfCareItems] = useState<SelfCareItem[]>([]);
  const [selfCareEntries, setSelfCareEntries] = useState<SelfCareEntryMap>({});
  const [hydratedDayKey, setHydratedDayKey] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setHydratedDayKey(null);

    async function loadSelfCareData() {
      const selectedDayKey = toDayKey(dayKey);
      const [items, savedWellness, savedMetrics, savedEntries] = await Promise.all([
        listAllSelfCareItems(),
        getDailyWellness(selectedDayKey),
        listDailyMetricsByDate(selectedDayKey),
        listDailySelfCareEntriesByDate(selectedDayKey),
      ]);

      if (!isActive) {
        return;
      }

      const nextMetrics: MetricState = { ...EMPTY_METRICS };
      savedMetrics.forEach((metric) => {
        nextMetrics[metric.metricType] = String(metric.value);
      });

      const nextEntries = Object.fromEntries(
        items.map((item) => [item.id, createEmptySelfCareEntry()]),
      ) as SelfCareEntryMap;

      savedEntries.forEach((entry) => {
        nextEntries[entry.selfCareId] = {
          isDone: entry.isDone,
          count: toInputNumber(entry.count),
          minutes: toInputNumber(entry.minutes),
          note: entry.note,
        };
      });

      setSelfCareItems(items);
      setPhysicalScoreState(savedWellness?.physicalScore ?? DEFAULT_WELLNESS_SCORE);
      setMentalScoreState(savedWellness?.mentalScore ?? DEFAULT_WELLNESS_SCORE);
      setNote("");
      setMetrics(nextMetrics);
      setSelfCareEntries(nextEntries);
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

  const setSelfCareEntry = useCallback((selfCareId: string, patch: Partial<SelfCareEntryState>) => {
    setSelfCareEntries((currentEntries) => ({
      ...currentEntries,
      [selfCareId]: {
        ...(currentEntries[selfCareId] ?? createEmptySelfCareEntry()),
        ...patch,
      },
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

    const selfCareDrafts = Object.entries(selfCareEntries).reduce<SelfCareDraft[]>((drafts, [selfCareId, entry]) => {
      const count = toNullableNumber(entry.count);
      const minutes = toNullableNumber(entry.minutes);
      const trimmedNote = entry.note.trim();

      if (!entry.isDone && count === null && minutes === null && trimmedNote === "") {
        return drafts;
      }

      drafts.push({
        selfCareId,
        isDone: entry.isDone,
        count,
        minutes,
        note: trimmedNote,
      });
      return drafts;
    }, []);

    await Promise.all([
      saveDailyWellness({
        date: selectedDayKey,
        physicalScore,
        mentalScore,
      }),
      replaceDailyMetrics(selectedDayKey, metricDrafts),
      replaceDailySelfCareEntries(selectedDayKey, selfCareDrafts),
    ]);
  }, [dayKey, mentalScore, metrics, physicalScore, selfCareEntries]);

  return {
    dayKey,
    isHydrated: hydratedDayKey === dayKey,
    physicalScore,
    mentalScore,
    note,
    metrics,
    selfCareItems,
    selfCareEntries,
    setPhysicalScore,
    setMentalScore,
    setNote,
    setMetric,
    setSelfCareEntry,
    save,
  };
}
