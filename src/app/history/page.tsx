import { AppShell } from "@/components/app-shell/app-shell";
import { HistoryScreen } from "@/features/history/components/history-screen";

export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      <HistoryScreen />
    </AppShell>
  );
}
