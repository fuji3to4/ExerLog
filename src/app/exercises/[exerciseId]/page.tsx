import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { ExerciseDetailScreen } from "@/features/library/components/exercise-detail-screen";

type ExerciseDetailPageProps = {
  params: Promise<{
    exerciseId: string;
  }>;
};

export function generateStaticParams() {
  return exerciseCatalog.map((exercise) => ({
    exerciseId: exercise.id,
  }));
}

export default async function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { exerciseId } = await params;
  const exercise = exerciseCatalog.find((entry) => entry.id === exerciseId);

  if (!exercise) {
    notFound();
  }

  return (
    <AppShell currentPath="/library">
      <ExerciseDetailScreen exercise={exercise} />
    </AppShell>
  );
}
