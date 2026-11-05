"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { listExerciseLogsBetween } from "@/features/storage/exercise-logs.repository";
import type { ExerciseLog } from "@/lib/types";

import { buildExerciseGraph, type ExerciseMeasure } from "../exercise-graph";
import { getDateRangeForPreset, RangePresetButtons, type DateRangePreset } from "../range-presets";
import { HistoryChart } from "./history-chart";
import { ExerciseRankingChart } from "./exercise-ranking-chart";

type Loaded = { logs: ExerciseLog[]; titles: Map<string, string> };

/** Exercise logs over a range: per exercise (top 10) and per day, as counts or minutes. */
export function ExerciseHistoryView() {
  const { t } = useTranslation();
  const selectorId = useId();
  const [measure, setMeasure] = useState<ExerciseMeasure>("count");
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const range = useMemo(() => getDateRangeForPreset(preset), [preset]);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    Promise.all([listExerciseLogsBetween(range.start, range.end), listAllExercises()])
      .then(([logs, exercises]) => {
        if (isActive) setLoaded({ logs, titles: new Map(exercises.map((exercise) => [exercise.id, exercise.title])) });
      })
      .catch((err) => {
        console.error("[history] exercise graph failed", err);
        if (isActive) setLoaded(null);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [range]);

  const graph = useMemo(
    () => (loaded ? buildExerciseGraph(loaded.logs, loaded.titles, range, measure) : null),
    [loaded, range, measure],
  );
  const unit = t(measure === "count" ? "history_exercise_unit_count" : "history_exercise_unit_minutes");
  const hasData = graph !== null && graph.perExercise.length > 0;

  return (
    <div>
      <div className="history-screen__chart-container" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <label htmlFor={selectorId} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: "600" }}>{t("history_graph_metric_label")}</span>
            <select
              id={selectorId}
              className="metric-selector"
              value={measure}
              onChange={(e) => setMeasure(e.currentTarget.value as ExerciseMeasure)}
            >
              <option value="count">{t("history_exercise_measure_count")}</option>
              <option value="minutes">{t("history_exercise_measure_minutes")}</option>
            </select>
          </label>

          <RangePresetButtons value={preset} onChange={setPreset} />
        </div>
      </div>

      {loading && <p className="history-screen__chart-loading">{t("common_loading")}</p>}

      {!loading && hasData && (
        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("history_exercise_by_exercise")}</h3>
            <ExerciseRankingChart items={graph.perExercise} unit={unit} />
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("history_exercise_by_day")}</h3>
            <div className="history-screen__chart-wrapper">
              <HistoryChart series={{ unit, decimals: 0, points: graph.daily, chart: "bar" }} />
            </div>
          </section>
        </div>
      )}

      {!loading && !hasData && <p className="history-screen__chart-empty">{t("history_graphs_empty")}</p>}
    </div>
  );
}
