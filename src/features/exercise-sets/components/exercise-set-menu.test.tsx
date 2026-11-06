import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { appDb } from "@/features/storage/app-db";
import { createExerciseSet } from "@/features/storage/exercise-sets.repository";
import type { ExerciseSet, ExerciseVideo } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseSetMenu } from "./exercise-set-menu";

const exercise: ExerciseVideo = {
  id: "a",
  title: "Squat",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  bodyArea: "full-body",
  purpose: "mobility",
  durationSeconds: 60,
  intensity: "low",
  updatedAt: "",
};

beforeEach(async () => {
  await appDb.exerciseSets.clear();
});

async function openMenu(sets: ExerciseSet[], props: Partial<Parameters<typeof ExerciseSetMenu>[0]> = {}) {
  const onChanged = vi.fn();
  const user = userEvent.setup();
  renderWithLanguage(<ExerciseSetMenu exercise={exercise} sets={sets} onChanged={onChanged} {...props} />, {
    initialLanguage: "en",
  });
  await user.click(screen.getByRole("button", { name: "Add Squat to a list" }));
  return { user, onChanged };
}

test("＋ appears only next to lists that already hold the video", async () => {
  const morning = await createExerciseSet("Morning", ["a"]);
  const night = await createExerciseSet("Night", []);
  await openMenu([morning, night]);

  expect(await screen.findByRole("menuitem", { name: "Add once more to Morning" })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Add once more to Night" })).toBeNull();
});

test("＋ appends a repeat and keeps the menu open", async () => {
  const morning = await createExerciseSet("Morning", ["a"]);
  const { user, onChanged } = await openMenu([morning]);

  await user.click(await screen.findByRole("menuitem", { name: "Add once more to Morning" }));

  await waitFor(async () => expect((await appDb.exerciseSets.get(morning.id))?.exerciseIds).toEqual(["a", "a"]));
  expect(onChanged).toHaveBeenCalled();
  expect(screen.getByRole("menu")).toBeInTheDocument();
});

test("remove item shows only with an entry and removes that entry", async () => {
  const morning = await createExerciseSet("Morning", ["a", "b", "a"]);
  const { user, onChanged } = await openMenu([morning], { entry: { setId: morning.id, entryKey: "a#2" } });

  await user.click(await screen.findByRole("menuitem", { name: "Remove from this list" }));

  await waitFor(async () => expect((await appDb.exerciseSets.get(morning.id))?.exerciseIds).toEqual(["a", "b"]));
  expect(onChanged).toHaveBeenCalled();
});

test("no remove item without an entry", async () => {
  const morning = await createExerciseSet("Morning", ["a"]);
  await openMenu([morning]);

  await screen.findByRole("menu");
  expect(screen.queryByRole("menuitem", { name: "Remove from this list" })).toBeNull();
});

test("a list holding the video more than once shows how many times", async () => {
  const morning = await createExerciseSet("Morning", ["a", "b", "a"]);
  const night = await createExerciseSet("Night", ["a"]);
  await openMenu([morning, night]);

  expect(await screen.findByRole("menuitemcheckbox", { name: /Morning/ })).toHaveTextContent("×2");
  expect(screen.getByRole("menuitemcheckbox", { name: /Night/ })).not.toHaveTextContent("×");
});

test("＋ answers the tap: a check flashes and the addition is announced", async () => {
  const morning = await createExerciseSet("Morning", ["a"]);
  const { user } = await openMenu([morning]);

  const addAgain = await screen.findByRole("menuitem", { name: "Add once more to Morning" });
  await user.click(addAgain);

  await waitFor(() => expect(addAgain).toHaveAttribute("data-added", "true"));
  expect(screen.getByRole("status")).toHaveTextContent("Added once more to Morning");
});
