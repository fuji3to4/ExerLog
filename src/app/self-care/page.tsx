"use client";

import { AppShell } from "@/components/app-shell/app-shell";
import { SelfCareScreen } from "@/features/self-care/components/self-care-screen";

export default function SelfCarePage() {
  return (
    <AppShell currentPath="/self-care">
      <SelfCareScreen />
    </AppShell>
  );
}
