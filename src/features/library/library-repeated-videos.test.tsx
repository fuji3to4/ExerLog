import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { PLAY_QUEUE_STORAGE_KEY, readPlayQueue } from "@/features/playlist/play-queue-store";
import { createExerciseSet, listExerciseSets } from "@/features/storage/exercise-sets.repository";
import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { LibraryScreen } from "./components/library-screen";
import { writeLibraryView } from "./library-view-store";

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

/** jsdom lays nothing out; give each reorder row a 50px slot so keyboard dragging can find neighbours. */
function layOutRows() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const row = this.closest("li");
    const index = row?.parentElement ? Array.from(row.parentElement.children).indexOf(row) : 0;
    const top = index * 50;
    return { x: 0, y: top, top, left: 0, width: 300, height: 50, bottom: top + 50, right: 300, toJSON: () => ({}) } as DOMRect;
  });
}

async function titles() {
  return (await screen.findAllByRole("heading", { level: 2 })).map((heading) => heading.textContent);
}

async function openMorning() {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
  await user.click(await screen.findByRole("button", { name: "Morning" }));
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat", "Alpha Stretch"]));
  return user;
}

beforeEach(async () => {
  await Promise.all([appDb.exercises.clear(), appDb.exerciseLogs.clear(), appDb.exerciseSets.clear(), appDb.listOrders.clear()]);
  window.sessionStorage.clear();
  await appDb.exercises.bulkAdd([makeExercise("ex-a", "Alpha Stretch"), makeExercise("ex-b", "Beta Squat")]);
  await createExerciseSet("Morning", ["ex-a", "ex-b", "ex-a"]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("a repeated video shows one card per entry, and All shows it once", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat"]));

  await user.click(screen.getByRole("button", { name: "Morning" }));
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat", "Alpha Stretch"]));
});

test("the second card opens its own position", async () => {
  await openMorning();
  const links = screen.getAllByRole("link", { name: /watch alpha stretch/i });
  expect(links[0].getAttribute("href")).not.toContain("entry=");
  expect(links[1].getAttribute("href")).toContain("entry=ex-a%232");
});

test("the published queue lists entry keys", async () => {
  window.sessionStorage.removeItem(PLAY_QUEUE_STORAGE_KEY);
  await openMorning();
  await waitFor(() => expect(readPlayQueue()?.exerciseIds).toEqual(["ex-a", "ex-b", "ex-a#2"]));
});

test("dragging in edit mode moves one copy and saves ids at once", async () => {
  layOutRows();
  const user = await openMorning();
  await user.click(screen.getByRole("switch", { name: /edit/i }));

  const handle = screen.getAllByRole("button", { name: "Move Alpha Stretch" })[1];
  handle.focus();
  await user.keyboard("[Space]");
  await user.keyboard("{ArrowUp}");
  await user.keyboard("[Space]");

  await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-a", "ex-a", "ex-b"]));
});

test("shuffle then back to Default restores the repeated order", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.1);
  const user = await openMorning();

  await user.selectOptions(screen.getByLabelText(/sort by/i), "shuffle");
  await waitFor(async () => expect((await titles()).filter((t) => t === "Alpha Stretch")).toHaveLength(2));
  await user.selectOptions(screen.getByLabelText(/sort by/i), "");

  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat", "Alpha Stretch"]));
});

test("remove from this list removes only that card", async () => {
  const user = await openMorning();

  await user.click(screen.getAllByRole("button", { name: "Add Alpha Stretch to a list" })[1]);
  await user.click(await screen.findByRole("menuitem", { name: "Remove from this list" }));

  await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-a", "ex-b"]));
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat"]));
});

test("All cards offer no remove item", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
  await screen.findAllByRole("heading", { level: 2 });

  await user.click(screen.getByRole("button", { name: "Add Alpha Stretch to a list" }));
  await screen.findByRole("menu");
  expect(screen.queryByRole("menuitem", { name: "Remove from this list" })).toBeNull();
});

test("removing a card while shuffled removes that card and leaves the others where they were", async () => {
  await appDb.exerciseSets.clear();
  const evening = await createExerciseSet("Evening", ["ex-a", "ex-b", "ex-a"]);
  writeLibraryView({
    set: evening.id,
    sort: "shuffle",
    shuffle: { listKey: evening.id, order: ["ex-a#2", "ex-b", "ex-a"], previousSort: "" },
  });
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat", "Alpha Stretch"]));

  // The last card is the first copy (key ex-a).
  await user.click(screen.getAllByRole("button", { name: "Add Alpha Stretch to a list" })[1]);
  await user.click(await screen.findByRole("menuitem", { name: "Remove from this list" }));

  await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-b", "ex-a"]));
  await waitFor(async () => expect(await titles()).toEqual(["Alpha Stretch", "Beta Squat"]));
});
