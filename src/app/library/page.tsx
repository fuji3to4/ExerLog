import { AppShell } from "@/components/app-shell/app-shell";
import { LibraryScreen } from "@/features/library/components/library-screen";

export default function LibraryPage() {
  return (
    <AppShell currentPath="/library">
      <LibraryScreen />
    </AppShell>
  );
}
