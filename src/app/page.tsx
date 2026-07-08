import { AppShell } from "@/components/app-shell/app-shell";
import { TodayScreen } from "@/features/today/components/today-screen";
import { HistoryScreen } from "@/features/history/components/history-screen";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      {/* Mobile: Show TodayScreen only */}
      <div className="lg:hidden">
        <TodayScreen />
      </div>

      {/* PC: Show TodayScreen + History in 2 columns */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        <div>
          <TodayScreen />
        </div>
        <div>
          <HistoryScreen />
        </div>
      </div>
    </AppShell>
  );
}
