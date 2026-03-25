import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { AppShell } from "@/components/app-shell/app-shell";
import { ExerciseDetailLoader } from "@/features/library/components/exercise-detail-loader";

type ExerciseDetailPageProps = {
  params: Promise<{
    exerciseId: string;
  }>;
};

export function generateStaticParams() {
  return exerciseCatalog.map((ex) => ({ exerciseId: ex.id }));
}

export default async function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { exerciseId } = await params;

  return (
    <AppShell currentPath="/library">
      <ExerciseDetailLoader exerciseId={exerciseId} />
    </AppShell>
  );
}
