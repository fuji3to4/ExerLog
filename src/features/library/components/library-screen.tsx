"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";

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
        <h1>Library</h1>
        <p>Browse the full exercise catalog and open a detail page when you want the video and quick logging tools.</p>
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
                  aria-label={`Watch ${exercise.title}`}
                >
                  Watch
                </Link>
              </div>

              <dl className="recommendation-card__meta">
                <div>
                  <dt>Duration</dt>
                  <dd>{exercise.durationMinutes} min</dd>
                </div>
                <div>
                  <dt>Intensity</dt>
                  <dd>{exercise.intensity}</dd>
                </div>
                <div>
                  <dt>Body area</dt>
                  <dd>{exercise.bodyArea.replace("-", " ")}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{exercise.purpose}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>
    </>
  );
}
