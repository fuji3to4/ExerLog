import { AppShell } from "@/components/app-shell/app-shell";
import { ExerciseDetailLoader } from "@/features/library/components/exercise-detail-loader";

export default async function ExercisesPage() {
  return (
    <AppShell currentPath="/library">
      <ExerciseDetailLoader />
    </AppShell>
  );
}
