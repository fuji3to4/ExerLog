import { AppShell } from "@/components/app-shell/app-shell";
import { HistoryScreen } from "@/features/history/components/history-screen";
import { HistoryDashboard } from "@/features/history/components/history-dashboard";

export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      {/* Mobile: HistoryScreen with toggle */}
      <div className="lg:hidden">
        <HistoryScreen />
      </div>

      {/* PC: flex layout with max-widths */}
      <div className="hidden lg:flex lg:gap-6 lg:justify-center">
        <div className="lg:w-full">
          <HistoryDashboard />
        </div>
      </div>
    </AppShell>
  );
}
