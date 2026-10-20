"use client";

import { useEffect, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { deleteDailyMetric, upsertDailyMetric } from "@/features/storage/daily-metrics.repository";
import type { MetricType } from "@/lib/types";
import { Switch } from "@/components/ui/switch";

import type { HistoryDaySummary } from "../history-query";

type DaySummaryProps = {
  selectedDate: string | null;
  summary: HistoryDaySummary | null;
  onChanged?: () => void;
};

type EditMetricState = {
  metricType: MetricType;
  value: string;
  unit: string;
};

type MetricField = {
  metricType: MetricType;
  unit: string;
};

const METRIC_FIELDS: MetricField[] = [
  { metricType: "height", unit: "cm" },
  { metricType: "weight", unit: "kg" },
  { metricType: "bodyFat", unit: "%" },
];

function getMetricLabelKey(metricType: MetricType) {
  if (metricType === "height") return "self_care_metric_height";
  if (metricType === "weight") return "self_care_metric_weight";
  return "self_care_metric_body_fat";
}

function EditMetricModal({
  state,
  onChange,
  onSave,
  onCancel,
}: {
  state: EditMetricState;
  onChange: (next: EditMetricState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="modal" onCancel={onCancel}>
      <div className="modal__content">
        <h2>{t("history_metrics_heading")}</h2>

        <div className="modal__field">
          <label htmlFor="edit-metric-value">{t(getMetricLabelKey(state.metricType))}</label>
          <div className="self-care-screen__metric-input">
            <input
              id="edit-metric-value"
              type="number"
              inputMode="decimal"
              value={state.value}
              onChange={(e) => onChange({ ...state, value: e.target.value })}
            />
            <span>{state.unit}</span>
          </div>
        </div>

        <div className="modal__actions">
          <button
            type="button"
            className="settings-action-button settings-action-button--secondary"
            onClick={onCancel}
          >
            {t("history_edit_cancel")}
          </button>
          <button type="button" className="settings-action-button" onClick={onSave}>
            {t("history_edit_save")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function DaySummary({ selectedDate, summary, onChanged }: DaySummaryProps) {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMetric, setEditingMetric] = useState<EditMetricState | null>(null);

  function formatMetricLabel(metricType: MetricType) {
    return t(getMetricLabelKey(metricType));
  }

  function getMetricAddKey(metricType: MetricType) {
    if (metricType === "height") return "history_metrics_add_height";
    if (metricType === "weight") return "history_metrics_add_weight";
    return "history_metrics_add_body_fat";
  }

  function getMetricDeleteKey(metricType: MetricType) {
    if (metricType === "height") return "history_metrics_delete_height";
    if (metricType === "weight") return "history_metrics_delete_weight";
    return "history_metrics_delete_body_fat";
  }

  async function handleSaveMetric() {
    if (!editingMetric || !selectedDate) return;

    if (editingMetric.value.trim() === "") return;

    const value = Number(editingMetric.value);
    if (!Number.isFinite(value)) return;

    await upsertDailyMetric(selectedDate, {
      metricType: editingMetric.metricType,
      value,
      unit: editingMetric.unit,
    });
    setEditingMetric(null);
    onChanged?.();
  }

  async function handleDeleteMetric(metricType: MetricType) {
    if (!selectedDate) return;
    if (!window.confirm(t("history_metric_delete_confirm"))) return;
    await deleteDailyMetric(selectedDate, metricType);
    onChanged?.();
  }

  if (!selectedDate || !summary) {
    return (
      <Card className="day-summary">
        <CardHeader>
          <CardTitle>{t("history_day_summary_heading")}</CardTitle>
          <label>
            <Switch
              className="ml-2 mr-2"
              aria-label={t("history_mode_edit")}
              checked={isEditMode}
              onCheckedChange={(checked) => setIsEditMode(checked)}
            />
            {isEditMode ? t("history_mode_edit") : t("history_mode_view")}
          </label>
        </CardHeader>
        <CardContent>
          <p>{t("history_day_summary_empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const metricMap = new Map(summary.metrics.map((metric) => [metric.metricType, metric]));

  return (
    <Card className="day-summary">
      <CardHeader>
        <CardTitle>{t("history_day_summary_heading")}</CardTitle>
        <label>
          <Switch
            className="ml-2 mr-2"
            aria-label={t("history_mode_edit")}
            checked={isEditMode}
            onCheckedChange={(checked) => setIsEditMode(checked)}
          />
          {isEditMode ? t("history_mode_edit") : t("history_mode_view")}
        </label>
      </CardHeader>

      <CardContent>
        {summary.metrics.length > 0 || isEditMode ? (
          <div className="day-summary__section">
            <h3>{t("history_metrics_heading")}</h3>
            <ul className="day-summary__list">
              {(isEditMode
                ? METRIC_FIELDS
                : summary.metrics.map((metric) => ({
                    metricType: metric.metricType,
                    unit: metric.unit,
                  }))
              ).map((field) => {
                const metric = metricMap.get(field.metricType);

                return (
                  <li key={field.metricType} className="day-summary__item">
                    <span>{formatMetricLabel(field.metricType)}</span>
                    {metric ? <span>{`${metric.value} ${metric.unit}`}</span> : null}
                    {isEditMode && metric ? (
                      <div className="day-summary__item-actions">
                        <button
                          type="button"
                          className="day-summary__action-btn"
                          onClick={() =>
                            setEditingMetric({
                              metricType: metric.metricType,
                              value: String(metric.value),
                              unit: metric.unit,
                            })
                          }
                        >
                          {t("action_edit")}
                        </button>
                        <button
                          type="button"
                          className="day-summary__action-btn day-summary__action-btn--danger"
                          onClick={() => void handleDeleteMetric(metric.metricType)}
                        >
                          {t(getMetricDeleteKey(metric.metricType))}
                        </button>
                      </div>
                    ) : null}
                    {isEditMode && !metric ? (
                      <button
                        type="button"
                        className="day-summary__action-btn"
                        onClick={() =>
                          setEditingMetric({
                            metricType: field.metricType,
                            value: "",
                            unit: field.unit,
                          })
                        }
                      >
                        {t(getMetricAddKey(field.metricType))}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {summary.selfCareLogs.length > 0 ? (
          <div className="day-summary__section">
            <h3>{t("history_self_care_heading")}</h3>
            <ul className="day-summary__list">
              {summary.selfCareLogs.map((entry) => (
                <li key={entry.selfCareId} className="day-summary__item">
                  <span>{entry.title}</span>
                  {entry.isDone ? <p>{t("self_care_done_label")}</p> : null}
                  {entry.count !== null ? <p>{`${t("self_care_count_label")}: ${entry.count}`}</p> : null}
                  {entry.minutes !== null ? (
                    <p>{`${t("self_care_minutes_label")}: ${entry.minutes}`}</p>
                  ) : null}
                  {entry.note ? <p>{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isEditMode && editingMetric && (
          <EditMetricModal
            state={editingMetric}
            onChange={setEditingMetric}
            onSave={() => void handleSaveMetric()}
            onCancel={() => setEditingMetric(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
