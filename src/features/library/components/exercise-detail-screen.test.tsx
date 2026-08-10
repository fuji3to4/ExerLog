import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseDetailScreen } from "./exercise-detail-screen";

beforeEach(async () => {
  await appDb.logs.clear();
});

const youtubeExercise: ExerciseVideo = {
  id: "neck-mobility-5",
  title: "Neck Mobility",
  description: "Gentle seated mobility work for the neck and shoulders.",
  videoUrl: "https://www.youtube.com/watch?v=equcr3cpxNQ&start=4&end=45",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationMinutes: 5,
  intensity: "low",
};

const nonEmbeddableExercise: ExerciseVideo = {
  id: "mp4-exercise",
  title: "MP4 Exercise",
  description: "",
  videoUrl: "https://example.com/video.mp4",
  thumbnailUrl: "https://cdn.example.com/thumb.jpg",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationMinutes: 5,
  intensity: "low",
};

test("shows a play button over the thumbnail instead of the external watch link", async () => {
  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  expect(await screen.findByRole("button", { name: /play neck mobility/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /watch video/i })).not.toBeInTheDocument();
});

test("clicking the play button swaps the thumbnail for an autoplaying, looping embed", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));

  const iframe = await screen.findByTitle("Neck Mobility");
  expect(iframe).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/equcr3cpxNQ?autoplay=1&start=4&end=45&loop=1&playlist=equcr3cpxNQ",
  );
  expect(screen.queryByRole("button", { name: /play neck mobility/i })).not.toBeInTheDocument();
});

test("falls back to the external watch link when the video isn't embeddable", async () => {
  renderWithLanguage(<ExerciseDetailScreen exercise={nonEmbeddableExercise} />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch video/i })).toHaveAttribute(
    "href",
    "https://example.com/video.mp4",
  );
  expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
});
