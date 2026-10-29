"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Ellipsis, ListFilter } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { resolveSetExercises } from "@/features/exercise-sets/resolve-set-exercises";
import { SetSwitcher } from "@/features/exercise-sets/components/set-switcher";
import { ExerciseSetMenu } from "@/features/exercise-sets/components/exercise-set-menu";
import { appDb } from "@/features/storage/app-db";
import { deleteExercise, listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { SetNameDialog } from "@/features/exercise-sets/components/set-name-dialog";
import { deleteExerciseSet, listExerciseSets, renameExerciseSet } from "@/features/storage/exercise-sets.repository";
import { countWatchesByExercise } from "@/features/storage/watch-events.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseSet, ExerciseVideo } from "@/lib/types";

import { ExerciseFormModal } from "./exercise-form-modal";
import { LibraryFilters } from "./library-filters";
import { VideoCard } from "./video-card";

type LibraryFilterState = {
  search: string;
  set: string;
  bodyArea: string;
  purpose: string;
  duration: string;
  intensity: string;
  sort: string;
};

const initialFilters: LibraryFilterState = {
  search: "",
  set: "",
  bodyArea: "",
  purpose: "",
  duration: "",
  intensity: "",
  sort: "",
};

const MENU_ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

export function LibraryScreen() {
  const [filters, setFilters] = useState<LibraryFilterState>(initialFilters);
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const [watchCounts, setWatchCounts] = useState<Map<string, number>>(new Map());
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseVideo | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [renamingSet, setRenamingSet] = useState<ExerciseSet | null>(null);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  const loadExercises = useCallback(async () => {
    const [nextExercises, nextWatchCounts, nextSets] = await Promise.all([
      listAllExercises(),
      countWatchesByExercise(),
      listExerciseSets(),
    ]);
    setExercises(nextExercises);
    setExerciseSets(nextSets);
    // A selected set that no longer exists (deleted here or arrived through sync) falls back to "All".
    setFilters((current) =>
      current.set && !nextSets.some((set) => set.id === current.set) ? { ...current, set: "" } : current,
    );
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

  async function handleDeleteSet(set: ExerciseSet) {
    if (!window.confirm(t("library_set_delete_confirm", { name: set.name }))) return;

    try {
      await deleteExerciseSet(set.id);
      setFilters((current) => ({ ...current, set: "" }));
    } catch (error) {
      console.error(error);
    } finally {
      await loadExercises();
    }
  }

  async function handleRenameSet(name: string) {
    if (!renamingSet) return;
    // A failure propagates so the dialog stays open and shows its error.
    try {
      await renameExerciseSet(renamingSet.id, name);
      setRenamingSet(null);
    } finally {
      await loadExercises();
    }
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

  const selectedSet = exerciseSets.find((set) => set.id === filters.set);
  // Videos of the selected set, in the set's order, before any other filter.
  const baseExercises = useMemo(
    () => (selectedSet ? resolveSetExercises(selectedSet, exercises) : exercises),
    [selectedSet, exercises],
  );

  const filteredExercises = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    const matches = baseExercises.filter((exercise) => {
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
  }, [baseExercises, filters, watchCounts]);

  // "Narrowed" means a search or one of the four filters is active; sorting does not count.
  const activeFilterCount = [filters.bodyArea, filters.purpose, filters.duration, filters.intensity].filter(Boolean).length;
  const isNarrowed = filters.search.trim() !== "" || activeFilterCount > 0;
  const countParams = { shown: filteredExercises.length, total: exercises.length };
  let countText: string;
  if (selectedSet) {
    countText = isNarrowed
      ? t("library_set_count_filtered", { name: selectedSet.name, shown: filteredExercises.length, total: baseExercises.length })
      : t("library_set_count", { name: selectedSet.name, count: baseExercises.length });
  } else {
    countText = isNarrowed ? t("library_count_filtered", countParams) : t("library_count_all", countParams);
  }

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
        </CardHeader>
      </Card>

      <SetSwitcher
        ariaLabel={t("library_sets_aria")}
        allLabel={t("library_set_all")}
        sets={exerciseSets}
        selectedId={selectedSet?.id ?? null}
        onSelect={(id) => setFilters((current) => ({ ...current, set: id ?? "" }))}
        trailing={
          selectedSet ? (
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="set-switcher__more" aria-label={t("library_set_actions_aria")}>
                  <Ellipsis aria-hidden className="h-5 w-5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-48 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                >
                  <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={() => setRenamingSet(selectedSet)}>
                    {t("library_set_rename")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={() => void handleDeleteSet(selectedSet)}>
                    {t("library_set_delete")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null
        }
      />

      <div className="library-screen__search-row">
        <div className="library-screen__search">
          <label htmlFor="search-exercises" className="sr-only">
            {t("library_search_label")}
          </label>
          <input
            id="search-exercises"
            type="search"
            value={filters.search}
            placeholder={t("library_search_placeholder")}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
        </div>
        <button
          type="button"
          className="library-screen__filters-toggle"
          aria-expanded={isFiltersOpen}
          onClick={() => setIsFiltersOpen((open) => !open)}
        >
          <ListFilter aria-hidden className="h-4 w-4" />
          {activeFilterCount > 0 ? t("library_filters_toggle_count", { count: activeFilterCount }) : t("library_filters_toggle")}
        </button>
      </div>

      {isFiltersOpen ? <LibraryFilters value={filters} onChange={setFilters} /> : null}

      {isEditMode ? (
        <div className="library-screen__edit-actions">
          <button type="button" className="settings-action-button" onClick={() => setIsAdding(true)}>
            {t("library_add")}
          </button>
        </div>
      ) : null}

      <div className="library-screen__count-row">
        <p className="library-screen__count" aria-live="polite">
          {countText}
        </p>
        <label className="library-screen__sort">
          <span className="sr-only">{t("library_sort_label")}</span>
          <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
            <option value="">{t("library_sort_default")}</option>
            <option value="most-watched">{t("library_sort_most_watched")}</option>
          </select>
        </label>
      </div>

      {/* Columns of at least 20rem that fill the row, so the grid lines up with the cards above. */}
      <section className="library-screen__results grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
        {filteredExercises.map((exercise) => {
          const watchCount = watchCounts.get(exercise.id) ?? 0;

          return (
            <VideoCard
              key={exercise.id}
              exercise={exercise}
              href={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
              headingLevel={2}
              meta={[
                t("meta_intensity_value", { value: formatIntensity(exercise.intensity) }),
                formatBodyArea(exercise.bodyArea),
                formatPurpose(exercise.purpose),
                watchCount > 0 ? t("library_watch_count", { count: watchCount }) : "",
              ]}
              menu={<ExerciseSetMenu exercise={exercise} sets={exerciseSets} onChanged={() => void loadExercises()} />}
            >
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
            </VideoCard>
          );
        })}
      </section>

      <SetNameDialog
        open={renamingSet !== null}
        title={t("set_name_rename_title")}
        initialName={renamingSet?.name ?? ""}
        onSubmit={handleRenameSet}
        onOpenChange={(open) => {
          if (!open) setRenamingSet(null);
        }}
      />

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
