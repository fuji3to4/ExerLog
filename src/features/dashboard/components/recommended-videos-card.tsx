"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useTodayData } from "@/features/today/use-today-data";
import { toDayKey } from "@/lib/date/day-key";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";
import { DashboardCard } from "./dashboard-card";

export function RecommendedVideosCard() {
  const date = toDayKey(new Date());
  const { isHydrated, recommendations } = useTodayData(date);

  if (!isHydrated) {
    return <DashboardCard title="Recommended Videos">Loading...</DashboardCard>;
  }

  return (
    <DashboardCard title="Recommended Videos">
      <div className="space-y-3">
        {recommendations.slice(0, 4).map((exercise) => {
          const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
          return (
            <Link
              key={exercise.id}
              href={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
              className="group flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted"
            >
              {thumbnailUrl && (
                <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={thumbnailUrl}
                    alt={exercise.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.title}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
