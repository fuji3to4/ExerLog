"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { appDb } from "@/features/storage/app-db";
import { clearAllExercises, listAllExercises, replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { clearAllExerciseLogs } from "@/features/storage/exercise-logs.repository";
import { generateExerciseCsv, parseExerciseCsv } from "../csv/exercise-csv";
import {
  generateConditionsCsv,
  generateDailyMetricsCsv,
  generateDailyWellnessCsv,
  generateExerciseLogsCsv,
} from "../csv/history-csv";

type DeleteState = "idle" | "confirming";

const UTF8_BOM = "\uFEFF";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([UTF8_BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BulkDeleteButton({
  label,
  confirmMessage,
  confirmBtnLabel,
  cancelBtnLabel,
  onConfirm,
}: {
  label: string;
  confirmMessage: string;
  confirmBtnLabel: string;
  cancelBtnLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [state, setState] = useState<DeleteState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startConfirm() {
    setState("confirming");
    timerRef.current = setTimeout(() => setState("idle"), 8000);
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("idle");
  }

  async function confirm() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("idle");
    await onConfirm();
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (state === "confirming") {
    return (
      <div className="bulk-delete-confirm">
        <p className="bulk-delete-confirm__message">{confirmMessage}</p>
        <div className="bulk-delete-confirm__actions">
          <button
            type="button"
            className="settings-action-button settings-action-button--secondary"
            onClick={cancel}
          >
            {cancelBtnLabel}
          </button>
          <button
            type="button"
            className="settings-action-button settings-action-button--danger"
            onClick={() => void confirm()}
          >
            {confirmBtnLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="settings-action-button settings-action-button--danger"
      onClick={startConfirm}
    >
      {label}
    </button>
  );
}

export function DataManagement() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    void appDb.exercises.count().then(setExerciseCount);
    void appDb.logs.count().then(setLogCount);
  }, []);

  async function handleExportExercises() {
    const exercises = await listAllExercises();
    downloadCsv("exercises.csv", generateExerciseCsv(exercises));
  }

  async function handleExportLogs() {
    const [logs, exercises] = await Promise.all([appDb.logs.toArray(), listAllExercises()]);
    const titleMap = new Map(exercises.map((e) => [e.id, e.title]));
    downloadCsv("exercise-logs.csv", generateExerciseLogsCsv(logs, titleMap));
  }

  async function handleExportDailyWellness() {
    const entries = await appDb.dailyWellness.toArray();
    downloadCsv("daily-wellness.csv", generateDailyWellnessCsv(entries));
  }

  async function handleExportDailyMetrics() {
    const entries = await appDb.dailyMetrics.toArray();
    downloadCsv("daily-metrics.csv", generateDailyMetricsCsv(entries));
  }

  async function handleExportLegacyConditions() {
    const conditions = await appDb.conditions.toArray();
    downloadCsv("conditions.csv", generateConditionsCsv(conditions));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t("settings_import_confirm"))) {
      e.target.value = "";
      return;
    }

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const { exercises, skipped } = parseExerciseCsv(text);

    try {
      await replaceAllExercises(exercises);
      const status =
        skipped > 0
          ? `${t("settings_import_success", { count: exercises.length })} (${skipped} skipped)`
          : t("settings_import_success", { count: exercises.length });
      setImportStatus(status);
      setExerciseCount(exercises.length);
    } catch {
      setImportStatus(t("settings_import_error", { error: "Failed to save" }));
    }

    e.target.value = "";
  }

  async function handleDeleteAllExercises() {
    await clearAllExercises();
    setExerciseCount(0);
    setImportStatus(t("settings_delete_success_exercises"));
  }

  async function handleDeleteAllLogs() {
    await clearAllExerciseLogs();
    setLogCount(0);
    setImportStatus(t("settings_delete_success_logs"));
  }

  return (
    <div className="data-management">
      <div className="data-management__group">
        <h3 className="data-management__group-heading">
          {t("settings_library_section_heading")}
        </h3>
        <div className="data-management__buttons">
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void handleExportExercises()}
          >
            {t("settings_export_exercises")}
          </button>
          <button
            type="button"
            className="settings-action-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {t("settings_import_exercises")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="visually-hidden"
            onChange={(e) => void handleFileChange(e)}
          />
        </div>
        <BulkDeleteButton
          label={t("settings_delete_all_exercises")}
          confirmMessage={t("settings_delete_all_exercises_confirm", { count: exerciseCount })}
          confirmBtnLabel={t("settings_delete_confirm_btn")}
          cancelBtnLabel={t("settings_delete_cancel_btn")}
          onConfirm={handleDeleteAllExercises}
        />
        {importStatus && <p className="data-management__status">{importStatus}</p>}
      </div>

      <div className="data-management__group">
        <h3 className="data-management__group-heading">
          {t("history_heading")}
        </h3>
        <div className="data-management__buttons">
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void handleExportLogs()}
          >
            {t("settings_export_logs")}
          </button>
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void handleExportDailyWellness()}
          >
            {t("settings_export_daily_wellness")}
          </button>
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void handleExportDailyMetrics()}
          >
            {t("settings_export_daily_metrics")}
          </button>
          <button
            type="button"
            className="settings-action-button settings-action-button--secondary"
            onClick={() => void handleExportLegacyConditions()}
          >
            {t("settings_export_conditions_legacy")}
          </button>
        </div>
        <BulkDeleteButton
          label={t("settings_delete_all_logs")}
          confirmMessage={t("settings_delete_all_logs_confirm", { count: logCount })}
          confirmBtnLabel={t("settings_delete_confirm_btn")}
          cancelBtnLabel={t("settings_delete_cancel_btn")}
          onConfirm={handleDeleteAllLogs}
        />
      </div>
    </div>
  );
}
