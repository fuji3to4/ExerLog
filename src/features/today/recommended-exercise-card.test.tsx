import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";

import { RecommendedExerciseCard } from "./components/recommended-exercise-card";

test("uses the watch destination provided by the container", () => {
  const exercise = exerciseCatalog.find((entry) => entry.id === "neck-mobility-5");

  render(
    <RecommendedExerciseCard
      exercise={exercise!}
      result={null}
      watchHref="/custom-watch-path"
      onLog={vi.fn()}
    />,
  );

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/custom-watch-path");
});
