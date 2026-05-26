"use client";

import { useEffect, useRef, useState } from "react";

import { localIsoNow } from "@/lib/date/local-iso";
import { formatTime } from "@/lib/date/format-timestamp";
import { useTranslation } from "@/features/i18n/use-translation";
import { deleteDailyCondition, updateDailyCondition } from "@/features/storage/daily-condition.repository";
import { deleteDailyMetric, upsertDailyMetric } from "@/features/storage/daily-metrics.repository";
import { deleteDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { deleteExerciseLog, updateExerciseLog } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import type { ConditionLevel, ExerciseLogResult, ExerciseVideo, MetricType, WellnessScore } from "@/lib/types";

import type { HistoryDaySummary } from "../history-query";

type DaySummaryProps = {
  selectedDate: string | null;
  summary: HistoryDaySummary | null;
  onChanged?: () => void;
};

type EditLogState = {
  id: string;
  exerciseId: string;
  result: ExerciseLogResult;
  loggedAt: string;
  date: string;
};

type EditConditionState = {
  conditionLevel: ConditionLevel;
  note: string;
};

type EditMetricState = {
  metricType: MetricType;
  value: string;
  unit: string;
};

type EditWellnessState = {
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
  note: string;
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

function toWellnessScore(value: number): WellnessScore {
  const roundedValue = Math.round(value);

  if (roundedValue <= 1) return 1;
  if (roundedValue >= 5) return 5;

  return roundedValue as WellnessScore;
}

function EditLogModal({
  state,
  exercises,
  onChange,
  onSave,
  onCancel,
}: {
  state: EditLogState;
  exercises: ExerciseVideo[];
  onChange: (next: EditLogState) => void;
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
        <h2>{t("history_edit_heading_log")}</h2>

        <div className="modal__field">
          <label htmlFor="edit-log-date">{t("history_edit_date_label")}</label>
          <input
            id="edit-log-date"
            type="date"
            value={state.date}
            onChange={(e) => onChange({ ...state, date: e.target.value })}
          />
        </div>

        <div className="modal__field">
          <label htmlFor="edit-log-exercise">{t("history_edit_exercise_label")}</label>
          <select
            id="edit-log-exercise"
            value={state.exerciseId}
            onChange={(e) => onChange({ ...state, exerciseId: e.target.value })}
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>

        <div className="modal__field">
          <label htmlFor="edit-log-result">{t("history_edit_result_label")}</label>
          <select
            id="edit-log-result"
            value={state.result}
            onChange={(e) => onChange({ ...state, result: e.target.value as ExerciseLogResult })}
          >
            <option value="did">{t("result_did")}</option>
            <option value="partial">{t("result_partial")}</option>
          </select>
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

function EditConditionModal({
  state,
  onChange,
  onSave,
  onCancel,
}: {
  state: EditConditionState;
  onChange: (next: EditConditionState) => void;
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
        <h2>{t("history_edit_heading_condition")}</h2>

        <div className="modal__field">
          <label htmlFor="edit-condition-level">{t("history_condition_heading")}</label>
          <select
            id="edit-condition-level"
            value={state.conditionLevel}
            onChange={(e) => onChange({ ...state, conditionLevel: e.target.value as ConditionLevel })}
          >
            <option value="good">{t("condition_good")}</option>
            <option value="okay">{t("condition_okay")}</option>
            <option value="tired">{t("condition_tired")}</option>
          </select>
        </div>

        <div className="modal__field">
          <label htmlFor="edit-condition-note">{t("condition_note_label")}</label>
          <textarea
            id="edit-condition-note"
            value={state.note}
            onChange={(e) => onChange({ ...state, note: e.target.value })}
          />
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

function EditWellnessModal({
  state,
  onChange,
  onSave,
  onCancel,
}: {
  state: EditWellnessState;
  onChange: (next: EditWellnessState) => void;
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
        <h2>{t("history_wellness_heading")}</h2>

        <div className="modal__field">
          <label htmlFor="edit-wellness-physical">{t("self_care_physical_label")}</label>
          <input
            id="edit-wellness-physical"
            type="number"
            min={1}
            max={5}
            value={state.physicalScore}
            onChange={(e) =>
              onChange({
                ...state,
                physicalScore: toWellnessScore(Number(e.target.value)),
              })
            }
          />
        </div>

        <div className="modal__field">
          <label htmlFor="edit-wellness-mental">{t("self_care_mental_label")}</label>
          <input
            id="edit-wellness-mental"
            type="number"
            min={1}
            max={5}
            value={state.mentalScore}
            onChange={(e) =>
              onChange({
                ...state,
                mentalScore: toWellnessScore(Number(e.target.value)),
              })
            }
          />
        </div>

        <div className="modal__field">
          <label htmlFor="edit-wellness-note">{t("condition_note_label")}</label>
          <textarea
            id="edit-wellness-note"
            value={state.note}
            onChange={(e) => onChange({ ...state, note: e.target.value })}
          />
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
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLog, setEditingLog] = useState<EditLogState | null>(null);
  const [editingCondition, setEditingCondition] = useState<EditConditionState | null>(null);
  const [editingMetric, setEditingMetric] = useState<EditMetricState | null>(null);
  const [editingWellness, setEditingWellness] = useState<EditWellnessState | null>(null);

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  function formatResult(result: HistoryDaySummary["logs"][number]["result"]) {
    if (result === "did") return t("result_did");
    return t("result_partial");
  }

  function formatCondition(level: NonNullable<HistoryDaySummary["conditionLevel"]>) {
    if (level === "good") return t("condition_good");
    if (level === "okay") return t("condition_okay");
    return t("condition_tired");
  }

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

  async function handleDeleteLog(logId: string) {
    if (!window.confirm(t("history_log_delete_confirm"))) return;
    await deleteExerciseLog(logId);
    onChanged?.();
  }

  async function handleSaveLog() {
    if (!editingLog) return;
    await updateExerciseLog({
      id: editingLog.id,
      date: editingLog.date,
      exerciseId: editingLog.exerciseId,
      result: editingLog.result,
      loggedAt: editingLog.loggedAt,
    });
    setEditingLog(null);
    onChanged?.();
  }

  async function handleDeleteCondition() {
    if (!selectedDate) return;
    if (!window.confirm(t("history_condition_delete_confirm"))) return;
    await deleteDailyCondition(selectedDate);
    onChanged?.();
  }

  async function handleSaveCondition() {
    if (!editingCondition || !selectedDate) return;
    await updateDailyCondition({
      date: selectedDate,
      conditionLevel: editingCondition.conditionLevel,
      note: editingCondition.note,
      updatedAt: localIsoNow(),
    });
    setEditingCondition(null);
    onChanged?.();
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

  async function handleSaveWellness() {
    if (!editingWellness || !selectedDate) return;
    await saveDailyWellness({
      date: selectedDate,
      physicalScore: editingWellness.physicalScore,
      mentalScore: editingWellness.mentalScore,
      note: editingWellness.note,
    });
    setEditingWellness(null);
    onChanged?.();
  }

  async function handleDeleteWellness() {
    if (!selectedDate) return;
    if (!window.confirm(t("history_wellness_delete_confirm"))) return;
    await deleteDailyWellness(selectedDate);
    onChanged?.();
  }

  if (!selectedDate || !summary) {
    return (
      <section className="card day-summary">
        <h2>{t("history_day_summary_heading")}</h2>
        <label>
          <input
            type="checkbox"
            aria-label={t("history_mode_edit")}
            checked={isEditMode}
            onChange={(e) => setIsEditMode(e.target.checked)}
          />
        </label>
        <p>{isEditMode ? t("history_mode_edit") : t("history_mode_view")}</p>
        <p>{t("history_day_summary_empty")}</p>
      </section>
    );
  }

  const updatedTime = summary.updatedAt ? formatTime(summary.updatedAt) : "";
  const metricMap = new Map(summary.metrics.map((metric) => [metric.metricType, metric]));
  const wellness = summary.wellness;

  return (
    <section className="card day-summary">
      <h2>{t("history_day_summary_heading")}</h2>
      <label>
        <input
          type="checkbox"
          aria-label={t("history_mode_edit")}
          checked={isEditMode}
          onChange={(e) => setIsEditMode(e.target.checked)}
        />
      </label>
      <p>{isEditMode ? t("history_mode_edit") : t("history_mode_view")}</p>

      <div className="day-summary__section">
        <h3>{t("history_exercises_heading")}</h3>
        {summary.logs.length === 0 ? (
          <p>{t("history_no_exercises")}</p>
        ) : (
          <ul className="day-summary__list">
            {summary.logs.map((log) => {
              const logTime = formatTime(log.loggedAt);
              return (
                <li key={log.id} className="day-summary__item">
                  <span>{log.title}</span>
                  {logTime && (
                    <span className="day-summary__time">{logTime}</span>
                  )}
                  <span className="day-summary__result">{formatResult(log.result)}</span>
                  {isEditMode && (
                    <div className="day-summary__item-actions">
                      <button
                        type="button"
                        className="day-summary__action-btn"
                        onClick={() =>
                          setEditingLog({
                            id: log.id,
                            exerciseId: log.exerciseId,
                            result: log.result,
                            loggedAt: log.loggedAt,
                            date: selectedDate,
                          })
                        }
                      >
                        {t("action_edit")}
                      </button>
                      <button
                        type="button"
                        className="day-summary__action-btn day-summary__action-btn--danger"
                        onClick={() => void handleDeleteLog(log.id)}
                      >
                        {t("action_delete")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {wellness || isEditMode ? (
        <div className="day-summary__section">
          <h3>{t("history_wellness_heading")}</h3>
          {wellness ? (
            <>
              <p>
                <span>{t("self_care_physical_label")}</span>:{" "}
                <span>{`${wellness.physicalScore} / 5`}</span>
              </p>
              <p>
                <span>{t("self_care_mental_label")}</span>:{" "}
                <span>{`${wellness.mentalScore} / 5`}</span>
              </p>
              {wellness.note ? <p>{wellness.note}</p> : null}
            </>
          ) : null}
          {isEditMode && (
            <div className="day-summary__item-actions">
              {wellness ? (
                <>
                  <button
                    type="button"
                    className="day-summary__action-btn"
                    onClick={() =>
                      setEditingWellness({
                        physicalScore: toWellnessScore(wellness.physicalScore),
                        mentalScore: toWellnessScore(wellness.mentalScore),
                        note: wellness.note ?? "",
                      })
                    }
                  >
                    {t("history_wellness_edit")}
                  </button>
                  <button
                    type="button"
                    className="day-summary__action-btn day-summary__action-btn--danger"
                    onClick={() => void handleDeleteWellness()}
                  >
                    {t("history_wellness_delete")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="day-summary__action-btn"
                  onClick={() =>
                    setEditingWellness({
                      physicalScore: 3,
                      mentalScore: 3,
                      note: "",
                    })
                  }
                >
                  {t("history_wellness_add")}
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}

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

      {summary.conditionLevel ? (
        <div className="day-summary__section">
          <h3>{t("history_condition_heading")}</h3>
          <p>{formatCondition(summary.conditionLevel)}</p>
          {summary.note ? <p>{summary.note}</p> : null}
          {updatedTime && (
            <p className="day-summary__time">{updatedTime}</p>
          )}
          {isEditMode && (
            <div className="day-summary__item-actions">
              <button
                type="button"
                className="day-summary__action-btn"
                onClick={() =>
                  setEditingCondition({
                    conditionLevel: summary.conditionLevel!,
                    note: summary.note,
                  })
                }
              >
                {t("action_edit")}
              </button>
              <button
                type="button"
                className="day-summary__action-btn day-summary__action-btn--danger"
                onClick={() => void handleDeleteCondition()}
              >
                {t("action_delete")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {isEditMode && editingLog && (
        <EditLogModal
          state={editingLog}
          exercises={exercises}
          onChange={setEditingLog}
          onSave={() => void handleSaveLog()}
          onCancel={() => setEditingLog(null)}
        />
      )}

      {isEditMode && editingCondition && (
        <EditConditionModal
          state={editingCondition}
          onChange={setEditingCondition}
          onSave={() => void handleSaveCondition()}
          onCancel={() => setEditingCondition(null)}
        />
      )}

      {isEditMode && editingMetric && (
        <EditMetricModal
          state={editingMetric}
          onChange={setEditingMetric}
          onSave={() => void handleSaveMetric()}
          onCancel={() => setEditingMetric(null)}
        />
      )}

      {isEditMode && editingWellness && (
        <EditWellnessModal
          state={editingWellness}
          onChange={setEditingWellness}
          onSave={() => void handleSaveWellness()}
          onCancel={() => setEditingWellness(null)}
        />
      )}
    </section>
  );
}
