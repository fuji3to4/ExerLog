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

/** jsdom lays nothing out; give each row a 50px slot so keyboard dragging can find neighbours. */
function layOutRows() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const row = this.closest("li");
    const index = row?.parentElement ? Array.from(row.parentElement.children).indexOf(row) : 0;
    const top = index * 50;
    return { x: 0, y: top, top, left: 0, width: 300, height: 50, bottom: top + 50, right: 300, toJSON: () => ({}) } as DOMRect;
  });
}

async function moveFirstRowDown(user: ReturnType<typeof userEvent.setup>) {
  const handle = screen.getAllByRole("button", { name: /^Move / })[0];
  handle.focus();
  await user.keyboard("[Space]");
  await user.keyboard("{ArrowDown}");
  await user.keyboard("[Space]");
}

function rowTitles() {
  return screen.getAllByRole("button", { name: /^Move / }).map((handle) => handle.getAttribute("aria-label")?.replace(/^Move /, ""));
}

async function cardTitles() {
  return (await screen.findAllByRole("heading", { level: 2 })).map((heading) => heading.textContent);
}

async function openLibrary() {
  const user = userEvent.setup();
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });
  await screen.findByRole("heading", { name: "Alpha Stretch" });
  return user;
}

beforeEach(async () => {
  await Promise.all([
    appDb.exercises.clear(),
    appDb.exerciseLogs.clear(),
    appDb.tombstones.clear(),
    appDb.listOrders.clear(),
    appDb.exerciseSets.clear(),
  ]);
  window.sessionStorage.clear();
  await appDb.exercises.bulkAdd([
    makeExercise("ex-a", "Alpha Stretch"),
    makeExercise("ex-b", "Beta Squat"),
    makeExercise("ex-c", "Gamma Lunge"),
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("the edit switch turns the cards into compact rows with Add, Edit and Delete", async () => {
  const user = await openLibrary();
  expect(screen.queryByRole("button", { name: /add exercise/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /^edit/i })).toBeNull();

  await user.click(screen.getByRole("switch", { name: /edit/i }));

  expect(screen.queryAllByRole("article")).toHaveLength(0);
  expect(rowTitles()).toEqual(["Alpha Stretch", "Beta Squat", "Gamma Lunge"]);
  expect(screen.getByRole("button", { name: /add exercise/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit Alpha Stretch" })).toHaveTextContent("Edit");
  expect(screen.getByRole("button", { name: "Delete Beta Squat" })).toHaveTextContent("Delete");
  // No separate reorder step, and nothing to save or cancel.
  expect(screen.queryByRole("button", { name: /reorder/i })).toBeNull();
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

  await user.click(screen.getByRole("switch", { name: /edit/i }));
  expect(await screen.findAllByRole("article")).toHaveLength(3);
  expect(screen.queryByRole("button", { name: /add exercise/i })).toBeNull();
});

test("edit mode hides the search, filters and sort, and clears them", async () => {
  const user = await openLibrary();
  await user.type(screen.getByRole("searchbox"), "Alpha");
  await user.click(screen.getByRole("button", { name: /^Filters/ }));
  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.selectOptions(screen.getByLabelText(/sort by/i), "shuffle");

  await user.click(screen.getByRole("switch", { name: /edit/i }));

  expect(screen.queryByRole("searchbox")).toBeNull();
  expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
  expect(screen.queryByLabelText(/body area/i)).toBeNull();
  expect(screen.queryByLabelText(/sort by/i)).toBeNull();
  expect(rowTitles()).toEqual(["Alpha Stretch", "Beta Squat", "Gamma Lunge"]);

  // Leaving keeps the cleared view.
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(screen.getByLabelText(/sort by/i)).toHaveValue("");
  expect(await cardTitles()).toEqual(["Alpha Stretch", "Beta Squat", "Gamma Lunge"]);
});

test("adds an exercise in edit mode", async () => {
  const user = await openLibrary();
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: /add exercise/i }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText(/title/i), "Delta Plank");
  await user.type(within(dialog).getByLabelText(/video url/i), "https://example.com/plank.mp4");
  await user.type(within(dialog).getByLabelText(/minutes/i), "3");
  await user.click(within(dialog).getByRole("button", { name: /save/i }));

  await waitFor(() => expect(rowTitles()).toContain("Delta Plank"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("edits an exercise from its row", async () => {
  const user = await openLibrary();
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  await user.click(screen.getByRole("button", { name: "Edit Alpha Stretch" }));

  const dialog = await screen.findByRole("dialog");
  const title = within(dialog).getByLabelText(/title/i);
  await user.clear(title);
  await user.type(title, "Alpha Stretch Long");
  await user.click(within(dialog).getByRole("button", { name: /save/i }));

  await waitFor(() => expect(rowTitles()[0]).toBe("Alpha Stretch Long"));
});

test("deletes an exercise from All after confirming, mentioning its logs", async () => {
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
  const user = await openLibrary();
  await user.click(screen.getByRole("switch", { name: /edit/i }));

  await user.click(screen.getByRole("button", { name: "Delete Beta Squat" }));

  expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/1 log/));
  await waitFor(() => expect(rowTitles()).toEqual(["Alpha Stretch", "Gamma Lunge"]));
  expect(await appDb.exercises.get("ex-b")).toBeUndefined();
});

test("keeps the exercise when deletion is cancelled", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const user = await openLibrary();
  await user.click(screen.getByRole("switch", { name: /edit/i }));

  await user.click(screen.getByRole("button", { name: "Delete Beta Squat" }));

  expect(rowTitles()).toEqual(["Alpha Stretch", "Beta Squat", "Gamma Lunge"]);
  expect(await appDb.exercises.get("ex-b")).toBeDefined();
});

test("a drag in All saves the order at once", async () => {
  layOutRows();
  const user = await openLibrary();
  await user.click(screen.getByRole("switch", { name: /edit/i }));

  await moveFirstRowDown(user);

  await waitFor(async () => expect(await getLibraryOrder()).toEqual(["ex-b", "ex-a", "ex-c"]));
  expect(rowTitles()).toEqual(["Beta Squat", "Alpha Stretch", "Gamma Lunge"]);

  // Turning edit off asks nothing and shows the cards in the saved order.
  await user.click(screen.getByRole("switch", { name: /edit/i }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await cardTitles()).toEqual(["Beta Squat", "Alpha Stretch", "Gamma Lunge"]);
});

describe("in a my-list", () => {
  beforeEach(async () => {
    await createExerciseSet("Morning", ["ex-a", "ex-b", "ex-a"]);
  });

  async function openMorningInEditMode() {
    const user = await openLibrary();
    await user.click(await screen.findByRole("button", { name: "Morning" }));
    await user.click(screen.getByRole("switch", { name: /edit/i }));
    await waitFor(() => expect(rowTitles()).toEqual(["Alpha Stretch", "Beta Squat", "Alpha Stretch"]));
    return user;
  }

  test("rows offer Remove instead of Delete", async () => {
    await openMorningInEditMode();
    expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove Alpha Stretch from this list" })[0]).toHaveTextContent("Remove");
  });

  test("Remove takes only that copy out of the list, without asking, and keeps the video", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const user = await openMorningInEditMode();

    await user.click(screen.getAllByRole("button", { name: "Remove Alpha Stretch from this list" })[1]);

    await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-a", "ex-b"]));
    await waitFor(() => expect(rowTitles()).toEqual(["Alpha Stretch", "Beta Squat"]));
    expect(confirm).not.toHaveBeenCalled();
    expect(await appDb.exercises.get("ex-a")).toBeDefined();
  });

  test("a drag saves the set's order at once, not the library's", async () => {
    layOutRows();
    const user = await openMorningInEditMode();

    await moveFirstRowDown(user);

    await waitFor(async () => expect((await listExerciseSets())[0].exerciseIds).toEqual(["ex-b", "ex-a", "ex-a"]));
    expect(await getLibraryOrder()).toEqual([]);
  });
});
