"use client";

import { useId } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

const SHOWN = 5;

/** "次に流れる": the next few videos of the run; tapping one jumps there. */
export function UpNext({ upcoming, onSelect }: { upcoming: ExerciseVideo[]; onSelect: (exerciseId: string) => void }) {
  const { t } = useTranslation();
  const headingId = useId();

  if (upcoming.length === 0) {
    return null;
  }

  const shown = upcoming.slice(0, SHOWN);
  const more = upcoming.length - shown.length;

  return (
    <section className="up-next" role="region" aria-labelledby={headingId}>
      <h3 id={headingId} className="up-next__heading">
        {t("playlist_up_next")}
      </h3>
      <ul className="up-next__list">
        {shown.map((exercise) => {
          const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
          return (
            <li key={exercise.id}>
              <button type="button" className="up-next__item" onClick={() => onSelect(exercise.id)}>
                {thumbnailUrl ? <img src={thumbnailUrl} alt="" loading="lazy" /> : <span className="up-next__no-thumb" />}
                <span>{exercise.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {more > 0 ? <p className="up-next__more">{t("playlist_up_next_more", { count: more })}</p> : null}
    </section>
  );
}
