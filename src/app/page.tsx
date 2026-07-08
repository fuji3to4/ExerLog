import { AppShell } from "@/components/app-shell/app-shell";
import { TodayScreen } from "@/features/today/components/today-screen";
import { HistoryDashboard } from "@/features/history/components/history-dashboard";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      {/* Mobile: Show TodayScreen only */}
      <div className="lg:hidden">
        <TodayScreen />
      </div>

      {/* PC: Show TodayScreen + HistoryDashboard in 1:2 ratio */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-1">
          <TodayScreen />
        </div>
        <div className="lg:col-span-2">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
