"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllExercises } from "@/features/storage/exercise-catalog.repository";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

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
  const [exercises, setExercises] = useState<ExerciseVideo[]>([]);
  const { t, formatIntensity, formatBodyArea, formatPurpose } = useTranslation();

  useEffect(() => {
    void listAllExercises().then(setExercises);
  }, []);

  const filteredExercises = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return exercises.filter((exercise) => {
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
  }, [exercises, filters]);

  return (
    <>
      <Card className="page-header">
        <CardHeader>
          <CardTitle>{t("library_heading")}</CardTitle>
          <p>{t("library_subheading")}</p>
        </CardHeader>
      </Card>

      <LibraryFilters value={filters} onChange={setFilters} />

      <section className="library-screen__results flex flex-wrap gap-4 justify-center">
        {filteredExercises.map((exercise) => {
          const headingId = `library-${exercise.id}`;
          const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

          return (
            <Card key={exercise.id} className="recommendation-card max-w-[400px]" aria-labelledby={headingId}>
              {thumbnailUrl ? (
                <div className="recommendation-card__thumbnail">
                  <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
                </div>
              ) : null}
              <div className="recommendation-card__header">
                <div>
                  <h2 id={headingId}>{exercise.title}</h2>
                  <p>{exercise.description}</p>
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
            </Card>
          );
        })}
      </section>
    </>
  );
}
