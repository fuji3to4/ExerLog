import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { LibraryScreen } from "./components/library-screen";

function makeExercise(id: string, title: string): ExerciseVideo {
  return {
    id,
    title,
    description: "",
    videoUrl: "https://example.com/video.mp4",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationSeconds: 300,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  };
}

beforeEach(async () => {
  await Promise.all([appDb.exercises.clear(), appDb.exerciseLogs.clear(), appDb.tombstones.clear()]);
  await appDb.exercises.bulkAdd([makeExercise("ex-a", "Alpha Stretch"), makeExercise("ex-b", "Beta Squat")]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("hides add, edit and delete until the edit switch is turned on", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByRole("heading", { name: "Alpha Stretch" });
  expect(screen.queryByRole("button", { name: /add exercise/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /^delete/i })).toBeNull();

  await user.click(screen.getByRole("switch", { name: /edit/i }));

  expect(screen.getByRole("button", { name: /add exercise/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /edit alpha stretch/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete beta squat/i })).toBeInTheDocument();
  // Watching stays available while editing.
  expect(screen.getByRole("link", { name: /watch alpha stretch/i })).toBeInTheDocument();

  await user.click(screen.getByRole("switch", { name: /edit/i }));
  expect(screen.queryByRole("button", { name: /add exercise/i })).toBeNull();
});

test("adds an exercise from the library in edit mode", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByRole("heading", { name: "Alpha Stretch" });
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: /add exercise/i }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/title/i), "Gamma Plank");
  await user.type(within(dialog).getByLabelText(/video url/i), "https://example.com/plank.mp4");
  await user.type(within(dialog).getByLabelText(/minutes/i), "3");
  await user.click(within(dialog).getByRole("button", { name: /save/i }));

  expect(await screen.findByRole("heading", { name: "Gamma Plank" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("edits an exercise from the library in edit mode", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByRole("heading", { name: "Alpha Stretch" });
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: /edit alpha stretch/i }));

  const dialog = await screen.findByRole("dialog");
  const title = within(dialog).getByLabelText(/title/i);
  await user.clear(title);
  await user.type(title, "Alpha Stretch Long");
  await user.click(within(dialog).getByRole("button", { name: /save/i }));

  expect(await screen.findByRole("heading", { name: "Alpha Stretch Long" })).toBeInTheDocument();
});

test("deletes an exercise after confirming, mentioning its logs", async () => {
  const user = userEvent.setup();
  await appDb.exerciseLogs.add({
    id: "log-1",
    date: "2026-10-20",
    exerciseId: "ex-b",
    result: "did",
    durationSeconds: 300,
    performedAt: "2026-10-20T08:00:00+09:00",
    updatedAt: "2026-10-20T08:00:00+09:00",
  });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByRole("heading", { name: "Beta Squat" });
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: /delete beta squat/i }));

  expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/1 log/));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Beta Squat" })).toBeNull());
  expect(await appDb.exercises.get("ex-b")).toBeUndefined();
});

test("keeps the exercise when deletion is cancelled", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(false);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByRole("heading", { name: "Beta Squat" });
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: /delete beta squat/i }));

  expect(screen.getByRole("heading", { name: "Beta Squat" })).toBeInTheDocument();
  expect(await appDb.exercises.get("ex-b")).toBeDefined();
});
