import { AppShell } from "@/components/app-shell/app-shell";
import { SettingsScreen } from "@/features/settings/components/settings-screen";

export default function SettingsPage() {
  return (
    <AppShell currentPath="/settings">
      <SettingsScreen />
    </AppShell>
  );
}
