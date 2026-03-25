import { AppShell } from "@/components/app-shell/app-shell";
import { ExerciseDetailLoader } from "@/features/library/components/exercise-detail-loader";

type ExerciseDetailPageProps = {
  params: Promise<{
    exerciseId: string;
  }>;
};

export default async function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { exerciseId } = await params;

  return (
    <AppShell currentPath="/library">
      <ExerciseDetailLoader exerciseId={exerciseId} />
    </AppShell>
  );
}
