import { AppShell } from "@/components/app-shell/app-shell";
import { HistoryScreen } from "@/features/history/components/history-screen";
import { toDayKey } from "@/lib/date/day-key";

export default function HistoryPage() {
  return (
    <AppShell currentPath="/history">
      <HistoryScreen month={toDayKey(new Date()).slice(0, 7)} />
    </AppShell>
  );
}
