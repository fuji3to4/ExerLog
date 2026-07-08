import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardLayout } from "@/components/app-shell/dashboard-layout";
import { TodaySummaryCard } from "@/features/dashboard/components/today-summary-card";
import { GraphStatsCard } from "@/features/dashboard/components/graph-stats-card";
import { RecommendedVideosCard } from "@/features/dashboard/components/recommended-videos-card";
import { RecentHistoryCard } from "@/features/dashboard/components/recent-history-card";

export default function DashboardPage() {
  return (
    <AppShell currentPath="/dashboard">
      <DashboardLayout>
        <TodaySummaryCard />
        <GraphStatsCard />
        <RecommendedVideosCard />
        <RecentHistoryCard />
      </DashboardLayout>
    </AppShell>
  );
}
