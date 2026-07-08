"use client";

import { useTodayData } from "@/features/today/use-today-data";
import { toDayKey } from "@/lib/date/day-key";
import { DashboardCard } from "./dashboard-card";

export function TodaySummaryCard() {
  const date = toDayKey(new Date());
  const { isHydrated, physicalScore, mentalScore, recommendations } = useTodayData(date);

  if (!isHydrated) {
    return <DashboardCard title="Today's Summary">Loading...</DashboardCard>;
  }

  return (
    <DashboardCard title="Today's Summary">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Physical</p>
            <p className="text-2xl font-bold">{physicalScore}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Mental</p>
            <p className="text-2xl font-bold">{mentalScore}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Recommended</p>
          <ul className="space-y-1">
            {recommendations.slice(0, 3).map((exercise) => (
              <li key={exercise.id} className="text-sm">
                {exercise.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
