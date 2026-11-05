import { screen } from "@testing-library/react";
import { useInsertionEffect } from "react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/video/youtube-iframe-api", () => ({ loadYouTubeIframeApi: () => new Promise(() => {}) }));

import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseDetailLoader } from "./components/exercise-detail-loader";

/** Mimics Next's client navigation: the URL changes after render, in an insertion effect. */
function NavigateThenRender({ to }: { to: string }) {
  useInsertionEffect(() => {
    window.history.pushState({}, "", to);
  }, [to]);
  return <ExerciseDetailLoader />;
}

beforeEach(async () => {
  await appDb.exercises.clear();
  await replaceAllExercises([
    {
      id: "ankle",
      title: "Ankle Circles",
      description: "",
      videoUrl: "https://youtu.be/vid-ankle",
      thumbnailUrl: "",
      bodyArea: "lower-body",
      purpose: "mobility",
      durationSeconds: 30,
      intensity: "low",
    },
  ]);
  window.history.replaceState({}, "", "/library");
});

test("finds the exercise when the URL is updated just after the first render (in-app navigation)", async () => {
  renderWithLanguage(<NavigateThenRender to="/exercises?exerciseId=ankle" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Ankle Circles" })).toBeInTheDocument();
});
