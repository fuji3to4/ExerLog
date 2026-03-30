"use client";

import { useEffect, useRef, useState } from "react";

import { localIsoNow } from "@/lib/date/local-iso";
import { formatTime } from "@/lib/date/format-timestamp";
import { useTranslation } from "@/features/i18n/use-translation";
import { deleteDailyCondition, updateDailyCondition } from "@/features/storage/daily-condition.repository";
import { deleteExerciseLog, updateExerciseLog } from "@/features/storage/exercise-logs.repository";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import type { ConditionLevel, ExerciseLogResult, ExerciseVideo } from "@/lib/types";

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
            <option value="could_not">{t("result_couldnt")}</option>
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

export function DaySummary({ selectedDate, summary, onChanged }: DaySummaryProps) {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [editingLog, setEditingLog] = useState<EditLogState | null>(null);
  const [editingCondition, setEditingCondition] = useState<EditConditionState | null>(null);

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  function formatResult(result: HistoryDaySummary["logs"][number]["result"]) {
    if (result === "did") return t("result_did");
    if (result === "partial") return t("result_partial");
    return t("result_couldnt");
  }

  function formatCondition(level: NonNullable<HistoryDaySummary["conditionLevel"]>) {
    if (level === "good") return t("condition_good");
    if (level === "okay") return t("condition_okay");
    return t("condition_tired");
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

  if (!selectedDate || !summary) {
    return (
      <section className="card day-summary">
        <h2>{t("history_day_summary_heading")}</h2>
        <p>{t("history_day_summary_empty")}</p>
      </section>
    );
  }

  const updatedTime = summary.updatedAt ? formatTime(summary.updatedAt) : "";

  return (
    <section className="card day-summary">
      <h2>{t("history_day_summary_heading")}</h2>

      <div className="day-summary__section">
        <h3>{t("history_exercises_heading")}</h3>
        {summary.logs.length === 0 ? (
          <p>{t("history_no_exercises")}</p>
        ) : (
          <ul className="day-summary__list">
            {summary.logs.map((log) => {
              const logTime = formatTime(log.loggedAt);
              return (
                <li key={log.exerciseId} className="day-summary__item">
                  <span>{log.title}</span>
                  {logTime && (
                    <span className="day-summary__time">{logTime}</span>
                  )}
                  <span className="day-summary__result">{formatResult(log.result)}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {summary.conditionLevel ? (
        <div className="day-summary__section">
          <h3>{t("history_condition_heading")}</h3>
          <p>{formatCondition(summary.conditionLevel)}</p>
          {summary.note ? <p>{summary.note}</p> : null}
          {updatedTime && (
            <p className="day-summary__time">{updatedTime}</p>
          )}
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
        </div>
      ) : null}

      {editingLog && (
        <EditLogModal
          state={editingLog}
          exercises={exercises}
          onChange={setEditingLog}
          onSave={() => void handleSaveLog()}
          onCancel={() => setEditingLog(null)}
        />
      )}

      {editingCondition && (
        <EditConditionModal
          state={editingCondition}
          onChange={setEditingCondition}
          onSave={() => void handleSaveCondition()}
          onCancel={() => setEditingCondition(null)}
        />
      )}
    </section>
  );
}
