"use client";

import { useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { appDb } from "@/features/storage/app-db";
import { listAllExercises, replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { generateExerciseCsv, parseExerciseCsv } from "../csv/exercise-csv";
import { generateConditionsCsv, generateExerciseLogsCsv } from "../csv/history-csv";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataManagement() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  async function handleExportExercises() {
    const exercises = await listAllExercises();
    downloadCsv("exercises.csv", generateExerciseCsv(exercises));
  }

  async function handleExportLogs() {
    const [logs, exercises] = await Promise.all([appDb.logs.toArray(), listAllExercises()]);
    const titleMap = new Map(exercises.map((e) => [e.id, e.title]));
    downloadCsv("exercise-logs.csv", generateExerciseLogsCsv(logs, titleMap));
  }

  async function handleExportConditions() {
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

    const text = await file.text();
    const { exercises, skipped } = parseExerciseCsv(text);

    try {
      await replaceAllExercises(exercises);
      const status =
        skipped > 0
          ? `${t("settings_import_success", { count: exercises.length })} (${skipped} skipped)`
          : t("settings_import_success", { count: exercises.length });
      setImportStatus(status);
    } catch {
      setImportStatus(t("settings_import_error", { error: "Failed to save" }));
    }

    e.target.value = "";
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
            onClick={() => void handleExportConditions()}
          >
            {t("settings_export_conditions")}
          </button>
        </div>
      </div>
    </div>
  );
}
