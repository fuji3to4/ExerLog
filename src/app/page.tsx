import { AppShell } from "@/components/app-shell/app-shell";
import { TodayScreen } from "@/features/today/components/today-screen";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      <TodayScreen />
    </AppShell>
  );
}
