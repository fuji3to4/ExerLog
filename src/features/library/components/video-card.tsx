"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ExerciseVideo } from "@/lib/types";
import { formatDuration } from "@/lib/date/duration";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

export type VideoCardProps = {
  exercise: ExerciseVideo;
  href: string;
  headingLevel: 2 | 3;
  /** Joined with " · " into one gray line; empty entries are skipped. */
  meta: string[];
  /** Small colored line above the title. */
  eyebrow?: string;
  /** Right of the title row (the ⋮ menu). */
  menu?: ReactNode;
  /** Card footer (log buttons, edit buttons). */
  children?: ReactNode;
};

/** YouTube-style video card: thumbnail with duration badge, bold 2-line title, gray meta line. */
export function VideoCard({ exercise, href, headingLevel, meta, eyebrow, menu, children }: VideoCardProps) {
  const { t } = useTranslation();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `library-${exercise.id}`;
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
  const duration = formatDuration(exercise.durationSeconds);
  // Without a thumbnail there is nowhere for the badge, so the duration leads the meta line.
  const metaParts = (thumbnailUrl ? meta : [duration, ...meta]).filter(Boolean);

  return (
    <article role="article" className="video-card" aria-labelledby={headingId}>
      {thumbnailUrl ? (
        <Link href={href} className="video-card__thumbnail" aria-hidden="true" tabIndex={-1}>
          <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
          <span className="video-card__duration">{duration}</span>
        </Link>
      ) : null}
      <div className="video-card__body">
        <div className="video-card__text">
          {eyebrow ? <p className="video-card__eyebrow">{eyebrow}</p> : null}
          <Heading id={headingId} className="video-card__title">
            <Link
              href={href}
              className="line-clamp-2"
              aria-label={t("action_watch_aria", { title: exercise.title })}
            >
              {exercise.title}
            </Link>
          </Heading>
          {metaParts.length > 0 ? <p className="video-card__meta">{metaParts.join(" · ")}</p> : null}
          {exercise.description ? (
            <p className="video-card__description line-clamp-2">{exercise.description}</p>
          ) : null}
        </div>
        {menu ? <div className="video-card__menu">{menu}</div> : null}
      </div>
      {children ? <div className="video-card__footer">{children}</div> : null}
    </article>
  );
}
