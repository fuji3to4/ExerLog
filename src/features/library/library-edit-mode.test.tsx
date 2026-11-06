import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { createExerciseSet, listExerciseSets } from "@/features/storage/exercise-sets.repository";
import { getLibraryOrder } from "@/features/storage/list-orders.repository";
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

describe("reorder mode", () => {
  /** jsdom lays nothing out; give each reorder row a 50px slot so keyboard dragging can find neighbours. */
  function layOutRows() {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const row = this.closest("li");
      const index = row?.parentElement ? Array.from(row.parentElement.children).indexOf(row) : 0;
      const top = index * 50;
      return { x: 0, y: top, top, left: 0, width: 300, height: 50, bottom: top + 50, right: 300, toJSON: () => ({}) } as DOMRect;
    });
  }

  async function moveFirstRowDown(user: ReturnType<typeof userEvent.setup>) {
    const handle = screen.getByRole("button", { name: "Move Alpha Stretch" });
    handle.focus();
    await user.keyboard("[Space]");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("[Space]");
  }

  beforeEach(async () => {
    await appDb.listOrders.clear();
    await appDb.exerciseSets.clear();
    window.sessionStorage.clear();
    await appDb.exercises.add(makeExercise("ex-c", "Gamma Lunge"));
  });

  test("drags All into a new saved order and shows it after Done", async () => {
    layOutRows();
    const user = userEvent.setup();
    renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
    await screen.findByRole("heading", { name: "Alpha Stretch" });
    await user.click(screen.getByRole("switch", { name: /edit/i }));

    await user.click(screen.getByRole("button", { name: "⇅ Reorder" }));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    await moveFirstRowDown(user);

    await waitFor(async () => expect(await getLibraryOrder()).toEqual(["ex-b", "ex-a", "ex-c"]));
    await user.click(screen.getByRole("button", { name: "Done" }));
    const titles = (await screen.findAllByRole("heading", { level: 2 })).map((heading) => heading.textContent);
    expect(titles).toEqual(["Beta Squat", "Alpha Stretch", "Gamma Lunge"]);
  });

  test("reordering a set saves the set's order, not the library's", async () => {
    layOutRows();
    await createExerciseSet("Morning", ["ex-a", "ex-b"]);
    const user = userEvent.setup();
    renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
    await user.click(await screen.findByRole("button", { name: "Morning" }));
    await user.click(screen.getByRole("switch", { name: /edit/i }));

    await user.click(screen.getByRole("button", { name: "⇅ Reorder" }));
    await moveFirstRowDown(user);

    await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-b", "ex-a"]));
    expect(await getLibraryOrder()).toEqual([]);
  });

  test("Reorder is unavailable while sorted, searched or filtered", async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
    await screen.findByRole("heading", { name: "Alpha Stretch" });
    await user.click(screen.getByRole("switch", { name: /edit/i }));
    const reorder = () => screen.getByRole("button", { name: "⇅ Reorder" });
    expect(reorder()).toBeEnabled();

    await user.selectOptions(screen.getByLabelText(/sort by/i), "most-watched");
    expect(reorder()).toBeDisabled();
    await user.selectOptions(screen.getByLabelText(/sort by/i), "");

    await user.type(screen.getByRole("searchbox"), "Alpha");
    expect(reorder()).toBeDisabled();
    await user.clear(screen.getByRole("searchbox"));

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
    expect(reorder()).toBeDisabled();
  });
});
