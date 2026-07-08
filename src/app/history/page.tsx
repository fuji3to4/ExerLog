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

      {/* PC: Calendar + Graphs side by side */}
      <div className="hidden lg:block">
        <HistoryDashboard />
      </div>
    </AppShell>
  );
}
