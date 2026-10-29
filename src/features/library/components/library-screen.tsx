"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { appDb } from "@/features/storage/app-db";
import { deleteExercise, listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { countWatchesByExercise } from "@/features/storage/watch-events.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";
import { formatDuration } from "@/lib/date/duration";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

import { ExerciseFormModal } from "./exercise-form-modal";
import { LibraryFilters } from "./library-filters";

type LibraryFilterState = {
  search: string;
  bodyArea: string;
  purpose: string;
  duration: string;
  intensity: string;
  sort: string;
};

const initialFilters: LibraryFilterState = {
  search: "",
  bodyArea: "",
  purpose: "",
  duration: "",
  intensity: "",
  sort: "",
};

export function LibraryScreen() {
  const [filters, setFilters] = useState<LibraryFilterState>(initialFilters);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [watchCounts, setWatchCounts] = useState<Map<string, number>>(new Map());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseVideo | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  const loadExercises = useCallback(async () => {
    const [nextExercises, nextWatchCounts] = await Promise.all([listAllExercises(), countWatchesByExercise()]);
    setExercises(nextExercises);
    setWatchCounts(nextWatchCounts);
  }, []);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  async function handleDelete(exercise: ExerciseVideo) {
    const logCount = await appDb.exerciseLogs.where("exerciseId").equals(exercise.id).count();

    const message =
      logCount > 0
        ? `${t("library_delete_has_logs", { count: logCount })}

${t("library_delete_confirm")}`
        : t("library_delete_confirm");

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

  const filteredExercises = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const matches = exercises.filter((exercise) => {
      if (filters.bodyArea && exercise.bodyArea !== filters.bodyArea) {
        return false;
      }

      if (filters.purpose && exercise.purpose !== filters.purpose) {
        return false;
      }

      if (filters.duration && exercise.durationSeconds > Number(filters.duration)) {
        return false;
      }

      if (filters.intensity && exercise.intensity !== filters.intensity) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return (
        exercise.title.toLowerCase().includes(searchTerm) ||
        exercise.description.toLowerCase().includes(searchTerm)
      );
    });

    if (filters.sort !== "most-watched") {
      return matches;
    }

    // Array.prototype.sort is stable, so ties keep catalog order.
    return matches.sort((a, b) => (watchCounts.get(b.id) ?? 0) - (watchCounts.get(a.id) ?? 0));
  }, [exercises, filters, watchCounts]);

  return (
    <>
      <Card className="page-header">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle>{t("library_heading")}</CardTitle>
            <label className="library-screen__edit-toggle">
              <span>{t("library_edit_mode_label")}</span>
              <Switch checked={isEditMode} onCheckedChange={setIsEditMode} />
            </label>
          </div>
          <p>{t("library_subheading")}</p>
        </CardHeader>
      </Card>

      <LibraryFilters value={filters} onChange={setFilters} />

      {isEditMode ? (
        <div className="library-screen__edit-actions">
          <button type="button" className="settings-action-button" onClick={() => setIsAdding(true)}>
            {t("library_add")}
          </button>
        </div>
      ) : null}

      <p className="library-screen__count" aria-live="polite">
        {t("library_result_count", { shown: filteredExercises.length, total: exercises.length })}
      </p>

      {/* Columns of at least 20rem that fill the row, so the grid lines up with the cards above. */}
      <section className="library-screen__results grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
        {filteredExercises.map((exercise) => {
          const headingId = `library-${exercise.id}`;
          const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
          const watchCount = watchCounts.get(exercise.id) ?? 0;

          return (
            <Card key={exercise.id} role="article" className="recommendation-card" aria-labelledby={headingId}>
              {thumbnailUrl ? (
                <div className="recommendation-card__thumbnail">
                  <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
                </div>
              ) : null}
              <div className="recommendation-card__header">
                <div>
                  <h2 id={headingId}>{exercise.title}</h2>
                  <p>{exercise.description}</p>
                  {watchCount > 0 ? (
                    <p className="library-screen__watch-count">{t("library_watch_count", { count: watchCount })}</p>
                  ) : null}
                </div>
                <Link
                  href={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
                  className="recommendation-card__watch-link"
                  aria-label={t("action_watch_aria", { title: exercise.title })}
                >
                  {t("action_watch")}
                </Link>
              </div>

              <dl className="recommendation-card__meta">
                <div>
                  <dt>{t("meta_duration")}</dt>
                  <dd>{formatDuration(exercise.durationSeconds)}</dd>
                </div>
                <div>
                  <dt>{t("meta_intensity")}</dt>
                  <dd>{formatIntensity(exercise.intensity)}</dd>
                </div>
                <div>
                  <dt>{t("meta_body_area")}</dt>
                  <dd>{formatBodyArea(exercise.bodyArea)}</dd>
                </div>
                <div>
                  <dt>{t("meta_purpose")}</dt>
                  <dd>{formatPurpose(exercise.purpose)}</dd>
                </div>
              </dl>

              {isEditMode ? (
                <div className="library-screen__card-actions">
                  <button
                    type="button"
                    className="settings-action-button settings-action-button--secondary"
                    onClick={() => setEditingExercise(exercise)}
                    aria-label={t("library_edit_aria", { title: exercise.title })}
                  >
                    {t("action_edit")}
                  </button>
                  <button
                    type="button"
                    className="settings-action-button settings-action-button--danger"
                    onClick={() => void handleDelete(exercise)}
                    aria-label={t("library_delete_aria", { title: exercise.title })}
                  >
                    {t("action_delete")}
                  </button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      {(isAdding || editingExercise !== null) && (
        <ExerciseFormModal
          exercise={editingExercise}
          onSaved={() => void handleFormSaved()}
          onCancel={handleFormCancel}
        />
      )}
    </>
  );
}
