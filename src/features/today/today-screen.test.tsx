import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

type FakePlayerOptions = { videoId: string; events?: { onStateChange?: (event: { data: number }) => void } };
const fakeYouTube = vi.hoisted(() => ({
  options: [] as FakePlayerOptions[],
  players: [] as { loadVideoById: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[],
}));

vi.mock("@/lib/video/youtube-iframe-api", () => ({
  loadYouTubeIframeApi: () =>
    Promise.resolve({
      PlayerState: { ENDED: 0 },
      Player: function Player(_el: HTMLElement, options: FakePlayerOptions) {
        fakeYouTube.options.push(options);
        const player = { loadVideoById: vi.fn(), destroy: vi.fn() };
        fakeYouTube.players.push(player);
        return player;
      },
    }),
}));

import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { createExerciseSet, listExerciseSets } from "@/features/storage/exercise-sets.repository";
import { writeSelectedSetId } from "@/features/exercise-sets/selected-set-store";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { RESHUFFLE_STORAGE_KEY } from "@/features/recommendations/reshuffle-store";
import { PLAYLIST_SETTINGS_STORAGE_KEY } from "@/features/playlist/playlist-settings-store";
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
  window.localStorage.removeItem(PLAYLIST_SETTINGS_STORAGE_KEY);
  fakeYouTube.options.length = 0;
  fakeYouTube.players.length = 0;
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
  await waitFor(() => expect(within(region).getByText("1 today / 1 total")).toBeInTheDocument());

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
  await waitFor(() => expect(within(firstDayCard).getByText("2 today / 2 total")).toBeInTheDocument());

  rerender(<TodayScreen date="2026-10-21" />);

  const secondDayCard = await screen.findByRole("article", { name: "Delta" });
  await waitFor(() => expect(within(secondDayCard).getByText("0 today / 2 total")).toBeInTheDocument());
});

test("shows Japanese fixed UI by default while leaving exercise titles unchanged", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "＋ 記録する" })).toBeInTheDocument();
  const card = await screen.findByRole("article", { name: "Delta" });
  expect(within(card).getByRole("link", { name: /Delta.*を見る/ })).toBeInTheDocument();
  expect(within(card).getByText("今日0回／全0回")).toBeInTheDocument();
});

test("the log count follows a delete made through the timeline", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  const card = await screen.findByRole("article", { name: "Delta" });
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));
  await waitFor(() => expect(within(card).getByText("今日1回／全1回")).toBeInTheDocument());
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));
  await waitFor(() => expect(within(card).getByText("今日2回／全2回")).toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByRole("button", { name: /Delta できた/ })).toHaveLength(2));

  fireEvent.click(screen.getAllByRole("button", { name: /Delta できた/ })[0]);
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

  await waitFor(() => expect(screen.getAllByRole("button", { name: /Delta できた/ })).toHaveLength(1));
  await waitFor(() => expect(within(card).getByText("今日1回／全1回")).toBeInTheDocument());
});

test("shows an inline alert when a log cannot be saved", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const add = vi.spyOn(appDb.exerciseLogs, "add").mockRejectedValueOnce(new Error("disk full"));

  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  const card = await screen.findByRole("article", { name: "Delta" });
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("記録できませんでした。もう一度お試しください。");
  expect(within(card).getByText("今日0回／全0回")).toBeInTheDocument();

  add.mockRestore();
  fireEvent.click(within(card).getByRole("button", { name: "できた" }));

  await waitFor(() => expect(within(card).getByText("今日1回／全1回")).toBeInTheDocument());
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
    within(region).getByText('This list has no videos yet. Add some from the "⋮" menu on a video card.'),
  ).toBeInTheDocument();
  expect(within(region).getByRole("link", { name: "Library" })).toHaveAttribute("href", "/library");
});

test("logging from a set card works like a recommendation", async () => {
  await createExerciseSet("Morning", ["delta"]);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  fireEvent.click(await screen.findByRole("button", { name: "Morning" }));
  const region = await screen.findByRole("region", { name: "Morning" });
  fireEvent.click(within(region).getByRole("button", { name: "Did it" }));

  await waitFor(() => expect(within(region).getByText("1 today / 1 total")).toBeInTheDocument());
  expect(await appDb.exerciseLogs.count()).toBe(1);
});

test("reshuffle is a small link-style button next to the heading", async () => {
  await replaceAllExercises(largeCatalog);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const before = await recommendedTitles();
  fireEvent.click(screen.getByRole("button", { name: "Show 3 others" }));
  const after = await recommendedTitles();

  expect(after.filter((title) => before.includes(title))).toEqual([]);
  expect(screen.queryByText(/Today's list stays short/)).toBeNull();
});

test("cards open the video from the title and have no Watch button text", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch delta/i })).toHaveAttribute(
    "href",
    "/exercises?exerciseId=delta",
  );
  expect(screen.queryByText("Watch")).toBeNull();
});

test("set menu on a Today card adds the video to a set", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning");
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "Add Delta to a list" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "Morning" }));

  await waitFor(async () => {
    const sets = await listExerciseSets();
    expect(sets.find((set) => set.name === "Morning")?.exerciseIds).toEqual(["delta"]);
  });
});

test("removing a video from the shown set makes its card disappear", async () => {
  const user = userEvent.setup();
  await createExerciseSet("Morning", ["delta", "epsilon"]);
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "Morning" }));
  const region = await screen.findByRole("region", { name: "Morning" });
  await user.click(within(region).getByRole("button", { name: "Add Delta to a list" }));
  await user.click(await screen.findByRole("menuitemcheckbox", { name: "Morning" }));

  await waitFor(() =>
    expect(within(region).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Epsilon"]),
  );
});

test("an empty library shows a starter hint in place of recommendations, then recommends after importing", async () => {
  await appDb.exercises.clear();
  const user = userEvent.setup();

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const region = await screen.findByRole("region", { name: /recommended/i });
  expect(within(region).getByText("No videos yet. Import the starter exercises to get going.")).toBeInTheDocument();
  expect(within(region).queryByRole("button", { name: "Show 3 others" })).not.toBeInTheDocument();

  await user.click(within(region).getByRole("button", { name: "Import starter exercises" }));

  await waitFor(() => expect(within(region).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0));
  expect(within(region).queryByText("No videos yet. Import the starter exercises to get going.")).not.toBeInTheDocument();
});

describe("continuous play", () => {
  const youTubeCatalog = [
    { ...exercise("delta", "Delta", "low"), videoUrl: "https://youtu.be/vid-delta" },
    { ...exercise("epsilon", "Epsilon", "low"), videoUrl: "https://youtu.be/vid-epsilon" },
    { ...exercise("zeta", "Zeta", "low"), videoUrl: "https://youtu.be/vid-zeta" },
  ];

  async function openSet(name: string) {
    renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });
    fireEvent.click(await screen.findByRole("button", { name }));
    return screen.findByRole("region", { name });
  }

  function card(region: HTMLElement, title: string) {
    return within(region).getByRole("article", { name: title });
  }

  function playingTitle(region: HTMLElement) {
    return region.querySelector(".today-screen__card--playing h3")?.textContent ?? null;
  }

  function finishCurrentVideo() {
    act(() => fakeYouTube.options[0].events?.onStateChange?.({ data: 1 }));
    act(() => fakeYouTube.options[0].events?.onStateChange?.({ data: 0 }));
  }

  beforeEach(async () => {
    await replaceAllExercises(youTubeCatalog);
    await createExerciseSet("Morning", ["delta", "epsilon", "zeta"]);
  });

  test("offers Play all only for a my-list with YouTube videos", async () => {
    renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });
    await screen.findByRole("region", { name: /recommended/i });
    expect(screen.queryByRole("button", { name: "▶ Play all" })).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "Morning" }));
    expect(await screen.findByRole("button", { name: "▶ Play all" })).toBeInTheDocument();
  });

  test("hides Play all when no video in the list can be embedded", async () => {
    await replaceAllExercises(catalog);
    await openSet("Morning");
    expect(screen.queryByRole("button", { name: "▶ Play all" })).toBeNull();
  });

  test("Play all plays the first video in its card and turns into Stop", async () => {
    const region = await openSet("Morning");
    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));

    expect(playingTitle(region)).toBe("Delta");
    expect(within(region).getByRole("region", { name: "Delta" })).toBeInTheDocument();
    await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-delta"));
    expect(screen.getByRole("button", { name: "■ Stop" })).toBeInTheDocument();
  });

  test("advancing swaps the video inside the one player instead of creating another", async () => {
    const region = await openSet("Morning");
    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

    finishCurrentVideo();

    await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "vid-epsilon" }));
    expect(playingTitle(region)).toBe("Epsilon");
    expect(fakeYouTube.options).toHaveLength(1);
    expect(fakeYouTube.players[0].destroy).not.toHaveBeenCalled();
  });

  test("with auto check, a finished video is logged and the next one plays", async () => {
    const region = await openSet("Morning");
    fireEvent.click(screen.getByRole("button", { name: "Auto check" }));
    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

    finishCurrentVideo();

    expect(await within(card(region, "Delta")).findByText("1 today / 1 total")).toBeInTheDocument();
    expect(playingTitle(region)).toBe("Epsilon");
  });

  test("without auto check, a finished video is not logged", async () => {
    const region = await openSet("Morning");
    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

    finishCurrentVideo();

    await waitFor(() => expect(playingTitle(region)).toBe("Epsilon"));
    expect(await appDb.exerciseLogs.count()).toBe(0);
  });

  test("while playing a card tap jumps to it; while idle it links to the detail screen", async () => {
    const region = await openSet("Morning");
    const zetaLink = within(card(region, "Zeta")).getByRole("link", { name: /watch zeta/i });
    expect(zetaLink).toHaveAttribute("href", "/exercises?exerciseId=zeta");

    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
    fireEvent.click(within(card(region, "Zeta")).getByRole("link", { name: /watch zeta/i }));

    expect(playingTitle(region)).toBe("Zeta");
  });

  test("Stop removes the player and logs nothing", async () => {
    const region = await openSet("Morning");
    fireEvent.click(screen.getByRole("button", { name: "Auto check" }));
    fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "■ Stop" }));

    expect(within(region).queryByRole("region", { name: "Delta" })).toBeNull();
    expect(playingTitle(region)).toBeNull();
    expect(screen.getByRole("button", { name: "▶ Play all" })).toBeInTheDocument();
    expect(await appDb.exerciseLogs.count()).toBe(0);
  });

  test("playback stops when this copy of the screen gets hidden (layout switch)", async () => {
    const observers: { callback: ResizeObserverCallback; targets: Element[] }[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        targets: Element[] = [];
        constructor(callback: ResizeObserverCallback) {
          observers.push({ callback, targets: this.targets });
        }
        observe(target: Element) {
          this.targets.push(target);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      const region = await openSet("Morning");
      fireEvent.click(screen.getByRole("button", { name: "▶ Play all" }));
      expect(playingTitle(region)).toBe("Delta");

      act(() => {
        for (const observer of observers) {
          const entries = observer.targets.map(
            (target) => ({ target, contentRect: { width: 0, height: 0 } }) as unknown as ResizeObserverEntry,
          );
          observer.callback(entries, {} as ResizeObserver);
        }
      });

      expect(playingTitle(region)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
