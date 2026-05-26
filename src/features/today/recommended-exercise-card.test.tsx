import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { renderWithLanguage } from "@/test/render-with-language";

import { RecommendedExerciseCard } from "./components/recommended-exercise-card";

test("renders a derived thumbnail image when a YouTube exercise has no stored thumbnail", () => {
  const exercise = {
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low" as const,
  };

  renderWithLanguage(
    <RecommendedExerciseCard exercise={exercise} result={null} watchHref="/watch" onLog={vi.fn()} onClear={vi.fn()} />,
  );

  expect(screen.getByRole("img", { name: /blank thumbnail exercise/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("uses the watch destination provided by the container", () => {
  const exercise = exerciseCatalog.find((entry) => entry.id === "neck-mobility-5");

  renderWithLanguage(
    <RecommendedExerciseCard
      exercise={exercise!}
      result={null}
      watchHref="/custom-watch-path"
      onLog={vi.fn()}
      onClear={vi.fn()}
    />,
    { initialLanguage: "en" }
  );

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/custom-watch-path");
});

test("translates metadata labels and actions while keeping exercise title raw", () => {
  const exercise = exerciseCatalog.find((entry) => entry.id === "neck-mobility-5");

  renderWithLanguage(
    <RecommendedExerciseCard
      exercise={exercise!}
      result={null}
      watchHref="/custom-watch-path"
      onLog={vi.fn()}
      onClear={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByText("時間")).toBeInTheDocument();
  expect(screen.getByText("強度")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /見る/i })).toBeInTheDocument();
});
