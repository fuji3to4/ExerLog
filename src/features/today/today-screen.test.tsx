import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { createExerciseSet } from "@/features/storage/exercise-sets.repository";
import { writeSelectedSetId } from "@/features/exercise-sets/selected-set-store";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { RESHUFFLE_STORAGE_KEY } from "@/features/recommendations/reshuffle-store";
import type { ExerciseDraft } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { TodayScreen } from "./components/today-screen";

function exercise(id: string, title: string, intensity: ExerciseDraft["intensity"]): ExerciseDraft {
  return {
    id,
    title,
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationSeconds: 300,
    intensity,
  };
}

// Three low-intensity exercises: every one of them is always recommended.
const catalog = [exercise("delta", "Delta", "low"), exercise("epsilon", "Epsilon", "low"), exercise("zeta", "Zeta", "low")];

// Adds high-intensity exercises so that only some are recommended and "tired" changes the set.
const largeCatalog = [
  exercise("alpha", "Alpha", "high"),
  exercise("beta", "Beta", "high"),
  exercise("gamma", "Gamma", "high"),
  ...catalog,
];

async function recommendedTitles() {
  const region = await screen.findByRole("region", { name: /recommended/i });
  return within(region)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent)
    .sort();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 20, 20, 0, 0));
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
    appDb.exercises.clear(),
    appDb.exerciseSets.clear(),
  ]);
  await replaceAllExercises(catalog);
});

afterEach(() => {
  window.localStorage.removeItem("lymly-record-modules");
  window.localStorage.removeItem(RESHUFFLE_STORAGE_KEY);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function seedLog(date: string, exerciseId: string) {
  await addExerciseLog({ date, exerciseId, result: "did", durationSeconds: 300 });
}

test("places the timeline under the header and above the recommendations", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();

  const header = screen.getByRole("heading", { name: "Today", level: 1 });
  const addButton = screen.getByRole("button", { name: "+ Add record" });
  const recommended = await screen.findByRole("region", { name: /recommended/i });

  expect(header.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(addButton.compareDocumentPosition(recommended) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("region", { name: /daily condition/i })).toBeNull();
});

test("recommends three exercises when nothing is recorded", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await recommendedTitles()).toEqual(["Delta", "Epsilon", "Zeta"]);
  expect(screen.getAllByRole("link", { name: /^watch /i })).toHaveLength(3);
  expect(screen.getByText("Something new")).toBeInTheDocument();
});

test("labels the usual pick from earlier watches", async () => {
  await appDb.watchEvents.bulkAdd([
    { id: "w1", date: "2026-10-18", exerciseId: "epsilon", watchedAt: "2026-10-18T09:00:00+09:00", updatedAt: "2026-10-18T09:00:00+09:00" },
    { id: "w2", date: "2026-10-19", exerciseId: "epsilon", watchedAt: "2026-10-19T09:00:00+09:00", updatedAt: "2026-10-19T09:00:00+09:00" },
  ]);

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const card = await screen.findByRole("article", { name: "Epsilon" });
  expect(within(card).getByText("Your usual")).toBeInTheDocument();
});

test("uses the latest wellness entry of the day for recommendations", async () => {
  await replaceAllExercises(largeCatalog);
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", physicalScore: 5, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T19:00:00+09:00", physicalScore: 1, mentalScore: 2, note: "" });

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await recommendedTitles()).toEqual(["Delta", "Epsilon", "Zeta"]);
});

test("ignores wellness and uses the standard recommendations when the wellness module is off", async () => {
  await replaceAllExercises(largeCatalog);
  const standard = renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });
  const expected = await recommendedTitles();
  standard.unmount();

  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T19:00:00+09:00", physicalScore: 1, mentalScore: 1, note: "" });
  window.localStorage.setItem(
    "lymly-record-modules",
    JSON.stringify({ order: ["wellness", "body", "circumference"], disabled: ["wellness"] }),
  );

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await recommendedTitles()).toEqual(expected);
});

test("keeps the day's recommendations after logging one of them", async () => {
  await replaceAllExercises(largeCatalog);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const before = await recommendedTitles();
  const region = screen.getByRole("region", { name: /recommended/i });
  fireEvent.click(within(region).getAllByRole("button", { name: "Did it" })[0]);
  await waitFor(() => expect(within(region).getByText("1 times today")).toBeInTheDocument());

  expect(await recommendedTitles()).toEqual(before);
});

test("the reshuffle button swaps in other exercises and the new set survives a reload", async () => {
  await replaceAllExercises(largeCatalog);
  const first = renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const before = await recommendedTitles();
  fireEvent.click(screen.getByRole("button", { name: "Show 3 others" }));
  const after = await recommendedTitles();

  expect(after.filter((title) => before.includes(title))).toEqual([]);
  first.unmount();

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });
  expect(await recommendedTitles()).toEqual(after);
});

test("shows watch and library links for the today screen", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await screen.findByRole("region", { name: /need something else/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /watch delta/i })).toHaveAttribute("href", "/exercises?exerciseId=delta");
  expect(within(screen.getByRole("region", { name: /need something else/i })).getByRole("link", { name: /library/i })).toHaveAttribute(
    "href",
    "/library",
  );
});

test("hydrates today's log counts and resets them when the selected day changes", async () => {
  await seedLog("2026-10-20", "delta");
  await seedLog("2026-10-20", "delta");

  const { rerender } = renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const firstDayCard = await screen.findByRole("article", { name: "Delta" });
  await waitFor(() => expect(within(firstDayCard).getByText("2 times today")).toBeInTheDocument());

  rerender(<TodayScreen date="2026-10-21" />);

  const secondDayCard = await screen.findByRole("article", { name: "Delta" });
  await waitFor(() => expect(within(secondDayCard).getByText("Not logged yet")).toBeInTheDocument());
});

test("shows Japanese fixed UI by default while leaving exercise titles unchanged", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "＋ 記録する" })).toBeInTheDocument();
  const card = await screen.findByRole("article", { name: "Delta" });
  expect(within(card).getByRole("link", { name: /Delta.*を見る/ })).toBeInTheDocument();
  expect(within(card).getByText("未記録")).toBeInTheDocument();
});

test("the log count follows a delete made through the timeline", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  const card = await screen.findByRole("article", { name: "Delta" });
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));
  await waitFor(() => expect(within(card).getByText("今日1回")).toBeInTheDocument());
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));
  await waitFor(() => expect(within(card).getByText("今日2回")).toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByRole("button", { name: /Delta できた/ })).toHaveLength(2));

  fireEvent.click(screen.getAllByRole("button", { name: /Delta できた/ })[0]);
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

  await waitFor(() => expect(screen.getAllByRole("button", { name: /Delta できた/ })).toHaveLength(1));
  await waitFor(() => expect(within(card).getByText("今日1回")).toBeInTheDocument());
});

test("shows an inline alert when a log cannot be saved", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const add = vi.spyOn(appDb.exerciseLogs, "add").mockRejectedValueOnce(new Error("disk full"));

  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  const card = await screen.findByRole("article", { name: "Delta" });
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("記録できませんでした。もう一度お試しください。");
  expect(within(card).getByText("未記録")).toBeInTheDocument();

  add.mockRestore();
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));

  await waitFor(() => expect(within(card).getByText("今日1回")).toBeInTheDocument());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("shows no switcher when there are no sets", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await recommendedTitles()).toEqual(["Delta", "Epsilon", "Zeta"]);
  expect(screen.queryByRole("group", { name: "Show" })).toBeNull();
});

test("switching to a set shows all its videos in order without slot labels or reshuffle", async () => {
  await createExerciseSet("Morning", ["zeta", "delta", "gone"]);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const switcher = await screen.findByRole("group", { name: "Show" });
  fireEvent.click(within(switcher).getByRole("button", { name: "Morning" }));

  const region = await screen.findByRole("region", { name: "Morning" });
  expect(screen.getByRole("heading", { name: "Morning", level: 2 })).toBeInTheDocument();
  expect(within(region).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Zeta", "Delta"]);
  expect(within(switcher).getByRole("button", { name: "Morning" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Show 3 others" })).toBeNull();
  for (const label of ["Your usual", "Something new", "It's been a while", "A change of pace"]) {
    expect(screen.queryByText(label)).toBeNull();
  }
});

test("remembers the chosen set on the next open", async () => {
  await createExerciseSet("Morning", ["zeta"]);
  const first = renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  fireEvent.click(await screen.findByRole("button", { name: "Morning" }));
  await screen.findByRole("region", { name: "Morning" });
  first.unmount();

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });
  expect(await screen.findByRole("region", { name: "Morning" })).toBeInTheDocument();
});

test("falls back to recommendations when the remembered set no longer exists", async () => {
  writeSelectedSetId("deleted-id");
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await recommendedTitles()).toEqual(["Delta", "Epsilon", "Zeta"]);
  expect(screen.getByRole("heading", { name: "Recommended for today", level: 2 })).toBeInTheDocument();
});

test("an empty set shows a hint linking to the library", async () => {
  await createExerciseSet("Empty");
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  fireEvent.click(await screen.findByRole("button", { name: "Empty" }));

  const region = await screen.findByRole("region", { name: "Empty" });
  expect(
    within(region).getByText('This set has no videos yet. Add some from the "⋯" menu on a library card.'),
  ).toBeInTheDocument();
  expect(within(region).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
});

test("logging from a set card works like a recommendation", async () => {
  await createExerciseSet("Morning", ["delta"]);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  fireEvent.click(await screen.findByRole("button", { name: "Morning" }));
  const region = await screen.findByRole("region", { name: "Morning" });
  fireEvent.click(within(region).getByRole("button", { name: "Did it" }));

  await waitFor(() => expect(within(region).getByText("1 times today")).toBeInTheDocument());
  expect(await appDb.exerciseLogs.count()).toBe(1);
});
