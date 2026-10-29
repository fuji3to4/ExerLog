import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import type { ExerciseVideo } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { RecommendedExerciseCard } from "./components/recommended-exercise-card";

const neckMobility: ExerciseVideo = {
  id: "neck-mobility-5",
  title: "Neck Mobility",
  description: "Loosen the neck",
  videoUrl: "https://example.com/neck",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 300,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

test("renders a derived thumbnail image when a YouTube exercise has no stored thumbnail", () => {
  const exercise = {
    ...neckMobility,
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  };

  renderWithLanguage(
    <RecommendedExerciseCard exercise={exercise} todayCount={0} sets={[]} onSetsChanged={vi.fn()} watchHref="/watch" onLog={vi.fn()} />,
  );

  expect(screen.getByAltText("Blank Thumbnail Exercise")).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("uses the watch destination provided by the container", () => {
  renderWithLanguage(
    <RecommendedExerciseCard exercise={neckMobility} todayCount={0} sets={[]} onSetsChanged={vi.fn()} watchHref="/custom-watch-path" onLog={vi.fn()} />,
    { initialLanguage: "en" },
  );

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute("href", "/custom-watch-path");
});

test("translates metadata labels and actions while keeping exercise title raw", () => {
  renderWithLanguage(
    <RecommendedExerciseCard exercise={neckMobility} todayCount={0} sets={[]} onSetsChanged={vi.fn()} watchHref="/custom-watch-path" onLog={vi.fn()} />,
  );

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByText(/強度/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Neck Mobility.*を見る/ })).toBeInTheDocument();
});

test("logs every press and shows today's count", async () => {
  const user = userEvent.setup();
  const onLog = vi.fn();

  renderWithLanguage(
    <RecommendedExerciseCard exercise={neckMobility} todayCount={2} sets={[]} onSetsChanged={vi.fn()} watchHref="/watch" onLog={onLog} />,
  );

  await user.click(screen.getByRole("button", { name: "できた" }));
  await user.click(screen.getByRole("button", { name: "できた" }));

  expect(onLog).toHaveBeenCalledTimes(2);
  expect(onLog).toHaveBeenNthCalledWith(1, "did");
  expect(onLog).toHaveBeenNthCalledWith(2, "did");
  expect(screen.getByText("今日2回")).toBeInTheDocument();
});
