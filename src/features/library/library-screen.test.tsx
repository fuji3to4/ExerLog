import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog.default";
import { appDb } from "@/features/storage/app-db";
import { createExerciseSet, listExerciseSets, setExerciseInSet } from "@/features/storage/exercise-sets.repository";
import { renderWithLanguage } from "@/test/render-with-language";

// Wrap the repository writes so single tests can make them reject while the rest hit the real store.
vi.mock("@/features/storage/exercise-sets.repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/storage/exercise-sets.repository")>();
  return {
    ...actual,
    setExerciseInSet: vi.fn(actual.setExerciseInSet),
    createExerciseSet: vi.fn(actual.createExerciseSet),
  };
});

import { LibraryScreen } from "./components/library-screen";

beforeEach(async () => {
  await appDb.watchEvents.clear();
  await appDb.exercises.clear();
  await appDb.exerciseSets.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
});

test("filters the exercise library by body area and a typed maximum duration", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.type(screen.getByLabelText(/duration/i), "4:30");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /shoulder rolls/i })).toBeInTheDocument();
});

test("arrow keys step the duration filter by 30 seconds", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  const duration = screen.getByLabelText(/duration/i);
  await user.click(duration);
  await user.keyboard("{ArrowUp}");
  expect(duration).toHaveValue("0:30");

  await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
  expect(duration).toHaveValue("3:30");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /breathing reset/i })).toBeInTheDocument();

  await user.keyboard("{ArrowDown}{ArrowDown}");
  expect(duration).toHaveValue("2:30");
  expect(screen.queryAllByRole("article")).toHaveLength(0);

  await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
  expect(duration).toHaveValue("");
  expect(screen.getAllByRole("article")).toHaveLength(6);
});

test("step buttons change the duration filter by 30 seconds", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  const duration = screen.getByLabelText(/duration/i);
  const increase = screen.getByRole("button", { name: /add 30 seconds/i });
  const decrease = screen.getByRole("button", { name: /subtract 30 seconds/i });

  await user.type(duration, "4:10");
  await user.click(increase);
  expect(duration).toHaveValue("4:30");
  expect(screen.getAllByRole("article")).toHaveLength(2);

  await user.click(decrease);
  await user.click(decrease);
  expect(duration).toHaveValue("3:30");

  for (let step = 0; step < 7; step += 1) await user.click(decrease);
  expect(duration).toHaveValue("");
  expect(screen.getAllByRole("article")).toHaveLength(6);
});

test("shows how many exercises the filters leave out of the whole library", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByText("Showing 6 of 6")).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");

  expect(screen.getByText("Showing 2 of 6")).toBeInTheDocument();
});

test("filters the exercise library by purpose and intensity", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.selectOptions(screen.getByLabelText(/purpose/i), "mobility");
  await user.selectOptions(screen.getByLabelText(/intensity/i), "low");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});

test("library supports simple text search", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.type(screen.getByLabelText(/search exercises/i), "neck");

  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: /shoulder rolls/i })).not.toBeInTheDocument();
});

test("library cards link to the exercise detail route", async () => {
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch neck mobility/i })).toHaveAttribute(
    "href",
    "/exercises?exerciseId=neck-mobility-5",
  );
});

test("library shows the shared thumbnail fallback for a blank-thumbnail YouTube exercise", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationSeconds: 300,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  });

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
});

test("renders Japanese library filters by default", async () => {
  renderWithLanguage(<LibraryScreen />);

  expect(screen.getByRole("heading", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/エクササイズを検索/i)).toHaveAttribute("placeholder", "タイトルまたは説明で検索");
  expect(await screen.findByRole("link", { name: /Neck Mobility.*見る/i })).toBeInTheDocument();
});

function watch(exerciseId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${exerciseId}-${index}`,
    date: "2026-10-20",
    exerciseId,
    watchedAt: `2026-10-20T0${index}:00:00+09:00`,
    updatedAt: "2026-10-20T00:00:00+09:00",
  }));
}

test("shows each card's own watch count and hides it when never watched", async () => {
  await appDb.watchEvents.bulkAdd(watch("hip-mobility-6", 3));

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  const hip = await screen.findByRole("article", { name: /hip mobility/i });
  expect(await within(hip).findByText("Watched: 3")).toBeInTheDocument();
  expect(within(screen.getByRole("article", { name: /shoulder rolls/i })).queryByText(/watched:/i)).toBeNull();
});

test("sorts by most watched, keeping catalog order for ties", async () => {
  const user = userEvent.setup();
  await appDb.watchEvents.bulkAdd([...watch("walk-in-place-10", 2), ...watch("neck-mobility-5", 5)]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findByText("Watched: 5");
  const defaultOrder = screen.getAllByRole("article").map((card) => card.getAttribute("aria-labelledby"));

  await user.selectOptions(screen.getByLabelText(/sort by/i), "most-watched");

  const titles = screen.getAllByRole("article").map((card) => within(card).getByRole("heading").textContent);
  expect(titles.slice(0, 2)).toEqual(["Neck Mobility", "Walk in Place"]);
  const rest = defaultOrder.filter((id) => id !== "library-neck-mobility-5" && id !== "library-walk-in-place-10");
  expect(screen.getAllByRole("article").slice(2).map((card) => card.getAttribute("aria-labelledby"))).toEqual(rest);
});

test("adds a video to a new set from the card menu", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.click(screen.getByRole("button", { name: "Add Shoulder Rolls to a set" }));
  await user.click(await screen.findByRole("menuitem", { name: "+ New set" }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Set name"), "Morning");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const sets = await listExerciseSets();
    expect(sets).toEqual([expect.objectContaining({ name: "Morning", exerciseIds: ["shoulder-roll-4"] })]);
  });
});

test("toggles set membership with checkboxes and keeps the menu open", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning");
  await createExerciseSet("Evening");

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.click(screen.getByRole("button", { name: "Add Shoulder Rolls to a set" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "Morning" }));
  expect(screen.getByRole("menuitemcheckbox", { name: "Evening" })).toBeInTheDocument();
  await user.click(screen.getByRole("menuitemcheckbox", { name: "Evening" }));

  await waitFor(async () => {
    const sets = await listExerciseSets();
    expect(sets.map((set) => set.exerciseIds)).toEqual([["shoulder-roll-4"], ["shoulder-roll-4"]]);
  });

  await user.click(screen.getByRole("menuitemcheckbox", { name: "Morning" }));

  await waitFor(async () => {
    const sets = await listExerciseSets();
    expect(sets.find((set) => set.name === "Morning")?.exerciseIds).toEqual([]);
    expect(sets.find((set) => set.name === "Evening")?.exerciseIds).toEqual(["shoulder-roll-4"]);
  });
});

test("cannot save a set with a blank name", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.click(screen.getByRole("button", { name: "Add Shoulder Rolls to a set" }));
  await user.click(await screen.findByRole("menuitem", { name: "+ New set" }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Set name"), "   ");
  expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
});

test("a failed toggle is logged and the checkbox still reflects the store", async () => {
  const user = userEvent.setup();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  await createExerciseSet("Morning");
  vi.mocked(setExerciseInSet).mockRejectedValueOnce(new Error("boom"));

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.click(screen.getByRole("button", { name: "Add Shoulder Rolls to a set" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "Morning" }));

  await waitFor(() => expect(consoleError).toHaveBeenCalled());
  expect(screen.getByRole("menuitemcheckbox", { name: "Morning" })).toHaveAttribute("aria-checked", "false");
  expect((await listExerciseSets())[0].exerciseIds).toEqual([]);
  consoleError.mockRestore();
});

test("the name dialog stays open and shows an error when creating a set fails", async () => {
  const user = userEvent.setup();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(createExerciseSet).mockRejectedValueOnce(new Error("boom"));

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.click(screen.getByRole("button", { name: "Add Shoulder Rolls to a set" }));
  await user.click(await screen.findByRole("menuitem", { name: "+ New set" }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Set name"), "Morning");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn't save. Please try again.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(await listExerciseSets()).toEqual([]);
  consoleError.mockRestore();
});

function articleTitles() {
  return screen.getAllByRole("article").map((card) => within(card).getByRole("heading").textContent);
}

test("filters by set in the order videos were added, skipping deleted ones", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning", ["neck-mobility-5", "gone", "shoulder-roll-4"]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");
  await user.selectOptions(screen.getByLabelText("Set"), "Morning");

  expect(articleTitles()).toEqual(["Neck Mobility", "Shoulder Rolls"]);
  expect(screen.getByText("Morning: 2 videos")).toBeInTheDocument();
});

test("set filter combines with other filters", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning", ["hip-mobility-6", "neck-mobility-5", "shoulder-roll-4"]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");
  await user.selectOptions(screen.getByLabelText("Set"), "Morning");
  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");

  expect(articleTitles()).toEqual(["Neck Mobility", "Shoulder Rolls"]);
});

test("renames the selected set", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning", ["shoulder-roll-4"]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");
  await user.selectOptions(screen.getByLabelText("Set"), "Morning");
  await user.click(screen.getByRole("button", { name: "Set actions" }));
  await user.click(await screen.findByRole("menuitem", { name: "Rename" }));

  const dialog = await screen.findByRole("dialog");
  const input = within(dialog).getByLabelText("Set name");
  expect(input).toHaveValue("Morning");
  await user.clear(input);
  await user.type(input, "Daily");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.getByLabelText("Set")).toHaveDisplayValue("Daily"));
  expect((await listExerciseSets())[0].name).toBe("Daily");
});

test("deleting the selected set returns the filter to All and keeps the videos", async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  await createExerciseSet("Morning", ["shoulder-roll-4"]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");
  await user.selectOptions(screen.getByLabelText("Set"), "Morning");
  await user.click(screen.getByRole("button", { name: "Set actions" }));
  await user.click(await screen.findByRole("menuitem", { name: "Delete this set" }));

  expect(confirm).toHaveBeenCalledWith('Delete the set "Morning"? The videos stay in the library.');
  await waitFor(() => expect(screen.getByLabelText("Set")).toHaveValue(""));
  expect(screen.getAllByRole("article")).toHaveLength(6);
  expect(await appDb.exercises.count()).toBe(6);
  expect(await listExerciseSets()).toEqual([]);
  confirm.mockRestore();
});

test("set actions button only appears while a set is selected", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning", ["shoulder-roll-4"]);

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");
  expect(screen.queryByRole("button", { name: "Set actions" })).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Set"), "Morning");
  expect(screen.getByRole("button", { name: "Set actions" })).toBeInTheDocument();
});
