"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { appDb } from "@/features/storage/app-db";
import { deleteExercise, listAllExercises } from "@/features/storage/exercise-catalog.repository";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseFormModal } from "./exercise-form-modal";

export function LibraryManagement() {
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [editingExercise, setEditingExercise] = useState<ExerciseVideo | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { t } = useTranslation();

  const loadExercises = useCallback(async () => {
    const all = await listAllExercises();
    setExercises(all);
  }, []);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  async function handleDelete(exercise: ExerciseVideo) {
    const logCount = await appDb.logs.where("exerciseId").equals(exercise.id).count();

    const message =
      logCount > 0
        ? `${t("settings_exercise_delete_has_logs", { count: logCount })}\n\n${t("settings_exercise_delete_confirm")}`
        : t("settings_exercise_delete_confirm");

    if (!window.confirm(message)) return;

    await deleteExercise(exercise.id);
    await loadExercises();
  }

  async function handleFormSaved() {
    setEditingExercise(null);
    setIsAdding(false);
    await loadExercises();
  }

  function handleFormCancel() {
    setEditingExercise(null);
    setIsAdding(false);
  }

  return (
    <div className="library-management">
      <button type="button" className="settings-action-button" onClick={() => setIsAdding(true)}>
        {t("settings_library_add")}
      </button>

      {exercises.length === 0 ? (
        <p className="settings-empty">{t("settings_library_empty")}</p>
      ) : (
        <ul className="settings-exercise-list">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="settings-exercise-item">
              <span className="settings-exercise-title">{exercise.title}</span>
              <div className="settings-exercise-actions">
                <button
                  type="button"
                  className="settings-action-button settings-action-button--secondary"
                  onClick={() => setEditingExercise(exercise)}
                >
                  {t("action_edit")}
                </button>
                <button
                  type="button"
                  className="settings-action-button settings-action-button--danger"
                  onClick={() => void handleDelete(exercise)}
                >
                  {t("action_delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(isAdding || editingExercise !== null) && (
        <ExerciseFormModal
          exercise={editingExercise}
          onSaved={() => void handleFormSaved()}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}
