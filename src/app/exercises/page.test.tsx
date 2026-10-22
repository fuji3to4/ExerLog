import type { ReactElement } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

import { exerciseCatalog } from "@/features/catalog/exercise-catalog.default";
import { appDb } from "@/features/storage/app-db";
import { MockSyncProvider } from "@/test/mock-sync-provider";
import { renderWithLanguage } from "@/test/render-with-language";

import ExercisesPage from "./page";

function renderPage(ui: ReactElement, options?: Parameters<typeof renderWithLanguage>[1]) {
  return renderWithLanguage(<MockSyncProvider>{ui}</MockSyncProvider>, options);
}

beforeEach(async () => {
  await appDb.exerciseLogs.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
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
    durationSeconds: 420,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  });

  window.history.pushState({}, "", "/exercises?exerciseId=be113122-1120-4320-af2b-129bc738f2dc");

  renderPage(await ExercisesPage(), { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "UUID Exercise" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /play uuid exercise/i })).toBeInTheDocument();
});
