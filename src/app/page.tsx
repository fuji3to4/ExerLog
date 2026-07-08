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

      {/* PC: flex layout with max-widths */}
      <div className="hidden lg:flex lg:gap-6 lg:justify-center">
        <div className="lg:max-w-[350px] lg:w-full">
          <TodayScreen />
        </div>
        <div className="lg:flex-1 lg:min-w-0">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
