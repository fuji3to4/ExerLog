import { screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";

import ExercisesPage from "./page";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog);
});

test("query-based exercise page renders a user-created exercise id", async () => {
  await appDb.exercises.add({
    id: "be113122-1120-4320-af2b-129bc738f2dc",
    title: "UUID Exercise",
    description: "Created after install",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationMinutes: 7,
    intensity: "low",
  });

  window.history.pushState({}, "", "/exercises?exerciseId=be113122-1120-4320-af2b-129bc738f2dc");

  renderWithLanguage(await ExercisesPage(), { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "UUID Exercise" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /play uuid exercise/i })).toBeInTheDocument();
});
