"use client";

import { useEffect, useState } from "react";
import { listCompletedDaysInMonth } from "@/features/history/history-query";
import { DashboardCard } from "./dashboard-card";

export function RecentHistoryCard() {
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadRecentHistory() {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

      try {
        const days = await listCompletedDaysInMonth(currentMonth);
        if (isActive) {
          // Get last 7 days
          const recentDays = days.slice(-7);
          setCompletedDays(recentDays);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadRecentHistory();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <DashboardCard title="Recent History">
      <div className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && completedDays.length === 0 && (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}

        {!loading && completedDays.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {completedDays.length} days completed
            </p>
            <div className="flex gap-1">
              {completedDays.map((day) => (
                <div
                  key={day}
                  className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center text-xs font-medium text-green-800"
                  title={day}
                >
                  {new Date(day).getDate()}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardCard>
  );
}
