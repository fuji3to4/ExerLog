import { AppShell } from "@/components/app-shell/app-shell";
import { TodayScreen } from "@/features/today/components/today-screen";
import { toDayKey } from "@/lib/date/day-key";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <TodayScreen date={toDayKey(new Date())} />
    </AppShell>
  );
}
