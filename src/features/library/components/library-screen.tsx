"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { useTranslation } from "@/features/i18n/use-translation";

import { LibraryFilters } from "./library-filters";

type LibraryFilterState = {
  search: string;
  bodyArea: string;
  purpose: string;
  duration: string;
  intensity: string;
};

const initialFilters: LibraryFilterState = {
  search: "",
  bodyArea: "",
  purpose: "",
  duration: "",
  intensity: "",
};

export function LibraryScreen() {
  const [filters, setFilters] = useState<LibraryFilterState>(initialFilters);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  const filteredExercises = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return exerciseCatalog.filter((exercise) => {
      if (filters.bodyArea && exercise.bodyArea !== filters.bodyArea) {
        return false;
      }

      if (filters.purpose && exercise.purpose !== filters.purpose) {
        return false;
      }

      if (filters.duration && exercise.durationMinutes !== Number(filters.duration)) {
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
  }, [filters]);

  return (
    <>
      <section className="card page-header">
        <h1>{t("library_heading")}</h1>
        <p>{t("library_subheading")}</p>
      </section>

      <LibraryFilters value={filters} onChange={setFilters} />

      <section className="library-screen__results">
        {filteredExercises.map((exercise) => {
          const headingId = `library-${exercise.id}`;

          return (
            <article key={exercise.id} className="card recommendation-card" aria-labelledby={headingId}>
              <div className="recommendation-card__header">
                <div>
                  <h2 id={headingId}>{exercise.title}</h2>
                  <p>{exercise.description}</p>
                </div>
                <Link
                  href={`/exercises/${exercise.id}`}
                  className="recommendation-card__watch-link"
                  aria-label={t("action_watch_aria", { title: exercise.title })}
                >
                  {t("action_watch")}
                </Link>
              </div>

              <dl className="recommendation-card__meta">
                <div>
                  <dt>{t("meta_duration")}</dt>
                  <dd>{t("duration_minutes", { count: exercise.durationMinutes })}</dd>
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
            </article>
          );
        })}
      </section>
    </>
  );
}
