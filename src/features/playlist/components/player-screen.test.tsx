import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

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

import { CelebrationProvider } from "@/features/feedback/celebration";
import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import type { ExerciseDraft, ExerciseVideo } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { LIBRARY_VIEW_STORAGE_KEY, readLibraryView, writeLibraryView } from "@/features/library/library-view-store";

import { PLAY_QUEUE_STORAGE_KEY, readPlayQueue, writePlayQueue } from "../play-queue-store";
import { PLAYLIST_SETTINGS_STORAGE_KEY, writePlaylistSettings } from "../playlist-settings-store";
import { PlayerScreen } from "./player-screen";

function draft(id: string, videoUrl = `https://youtu.be/vid-${id}`): ExerciseDraft {
  return {
    id,
    title: id.toUpperCase(),
    description: "",
    videoUrl,
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationSeconds: 60,
    intensity: "low",
  };
}

function asVideo(d: ExerciseDraft): ExerciseVideo {
  return { ...d, updatedAt: "" };
}

const drafts = [
  draft("a"),
  draft("b"),
  draft("c"),
  draft("z"),
  draft("web", "https://example.com/web.mp4"),
  draft("k", "https://youtu.be/vid-k?start=10&end=20"),
];

function open(id: string, logDate: string | null = null, entryKey: string = id) {
  window.history.replaceState({}, "", `/exercises?exerciseId=${id}`);
  const exercise = asVideo(drafts.find((d) => d.id === id)!);
  return renderWithLanguage(
    <CelebrationProvider>
      <PlayerScreen exercise={exercise} entryKey={entryKey} logDate={logDate} />
    </CelebrationProvider>,
    { initialLanguage: "en" },
  );
}

function finishCurrentVideo() {
  act(() => fakeYouTube.options[0].events?.onStateChange?.({ data: 1 }));
  act(() => fakeYouTube.options[0].events?.onStateChange?.({ data: 0 }));
}

async function logsFor(exerciseId: string) {
  return appDb.exerciseLogs.where("exerciseId").equals(exerciseId).toArray();
}

beforeEach(async () => {
  fakeYouTube.options.length = 0;
  fakeYouTube.players.length = 0;
  window.localStorage.removeItem(PLAYLIST_SETTINGS_STORAGE_KEY);
  window.sessionStorage.removeItem(PLAY_QUEUE_STORAGE_KEY);
  await Promise.all([appDb.exerciseLogs.clear(), appDb.watchEvents.clear(), appDb.exercises.clear()]);
  await replaceAllExercises(drafts);
  writePlayQueue({ name: "Morning", exerciseIds: ["a", "b", "c"] });
});

function turnOn(extra: { loop?: boolean; autoCheck?: boolean } = {}) {
  writePlaylistSettings({ continuous: true, loop: extra.loop ?? false, autoCheck: extra.autoCheck ?? false });
}

test("mode off looks like today's player: ▶ and nothing continuous", async () => {
  open("b");

  expect(await screen.findByRole("button", { name: "Play B" })).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "Continuous play" })).toHaveAttribute("aria-checked", "false");
  expect(screen.queryByText("Up next")).toBeNull();
  expect(screen.queryByRole("button", { name: "Next video" })).toBeNull();
  expect(screen.queryByText(/Morning ·/)).toBeNull();
  expect(fakeYouTube.options).toHaveLength(0);

  await waitFor(() => expect(screen.getByRole("button", { name: "Play B" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Play B" }));
  await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-b"));
});

test("mode on autoplays the opened video and shows its place in the list", async () => {
  turnOn();
  open("b");

  await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-b"));
  expect(await screen.findByText("Morning · 2/3")).toBeInTheDocument();
  const upNext = screen.getByRole("region", { name: "Up next" });
  expect(within(upNext).getAllByRole("button").map((b) => b.textContent)).toEqual(["C"]);
  expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
});

test("a finished video is auto-logged and the next one swaps into the same player", async () => {
  turnOn({ autoCheck: true });
  open("a");
  await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
  await screen.findByText("Morning · 1/3");

  finishCurrentVideo();

  await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "vid-b" }));
  expect(fakeYouTube.options).toHaveLength(1);
  expect(await screen.findByRole("heading", { name: "B" })).toBeInTheDocument();
  await waitFor(async () => expect(await logsFor("a")).toHaveLength(1));
  expect((await logsFor("a"))[0].result).toBe("did");
  expect(window.location.search).toContain("exerciseId=b");
});

test("a manual log is not doubled by auto-check", async () => {
  turnOn({ autoCheck: true });
  open("a");
  await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
  await screen.findByText("Morning · 1/3");

  fireEvent.click(await screen.findByRole("button", { name: "Did it" }));
  await waitFor(async () => expect(await logsFor("a")).toHaveLength(1));
  finishCurrentVideo();

  await screen.findByRole("heading", { name: "B" });
  expect(await logsFor("a")).toHaveLength(1);
});

test("⏭ skips without logging", async () => {
  turnOn({ autoCheck: true });
  open("a");
  await screen.findByText("Morning · 1/3");

  fireEvent.click(screen.getByRole("button", { name: "Next video" }));

  expect(await screen.findByRole("heading", { name: "B" })).toBeInTheDocument();
  expect(await appDb.exerciseLogs.count()).toBe(0);
});

test("tapping an up-next item jumps to it", async () => {
  turnOn();
  open("a");
  const upNext = await screen.findByRole("region", { name: "Up next" });
  // Tap once the player exists, so the jump is a swap inside it.
  await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

  fireEvent.click(within(upNext).getByRole("button", { name: "C" }));

  expect(await screen.findByRole("heading", { name: "C" })).toBeInTheDocument();
  await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "vid-c" }));
});

test("an exercise outside the stored list plays alone", async () => {
  turnOn();
  open("z");

  expect(await screen.findByText("This video · 1/1")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Up next" })).toBeNull();
  await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-z"));
});

test("a non-YouTube video shows the watch link and no player even with the mode on", async () => {
  turnOn();
  writePlayQueue({ name: "Morning", exerciseIds: ["web", "a"] });
  open("web");

  expect(await screen.findByRole("link", { name: "Watch video" })).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(fakeYouTube.options).toHaveLength(0);
});

test("turning the switch on while nothing plays starts playback", async () => {
  open("a");
  await screen.findByRole("button", { name: "Play A" });

  fireEvent.click(screen.getByRole("switch", { name: "Continuous play" }));

  await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-a"));
  expect(await screen.findByText("Morning · 1/3")).toBeInTheDocument();
});

test("auto logs go to the day the player was opened for", async () => {
  turnOn({ autoCheck: true });
  open("a", "2026-10-19");
  await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
  await screen.findByText("Morning · 1/3");

  finishCurrentVideo();

  await waitFor(async () => expect(await logsFor("a")).toHaveLength(1));
  expect((await logsFor("a"))[0].date).toBe("2026-10-19");
});

test("after a single play ends, turning the switch on starts a run", async () => {
  open("a");
  await waitFor(() => expect(screen.getByRole("button", { name: "Play A" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Play A" }));
  await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
  finishCurrentVideo();

  fireEvent.click(screen.getByRole("switch", { name: "Continuous play" }));

  await waitFor(() => expect(fakeYouTube.options).toHaveLength(2));
  expect(fakeYouTube.options[1].videoId).toBe("vid-a");
});

test("▶ waits until the list is known", async () => {
  open("b");

  expect(screen.getByRole("button", { name: "Play B" })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Play B" })).toBeEnabled());
});

describe("shuffle chip", () => {
  const upNextTitles = () =>
    within(screen.getByRole("region", { name: "Up next" }))
      .queryAllByRole("button")
      .map((b) => b.textContent);
  const chip = () => screen.getByRole("button", { name: "Shuffle" });

  beforeEach(() => {
    window.sessionStorage.removeItem(LIBRARY_VIEW_STORAGE_KEY);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("from the library: shuffles the rest after the playing video and switches the library to Shuffle", async () => {
    writePlayQueue({ name: "All", exerciseIds: ["a", "b", "c", "z"], source: "library", shuffled: false });
    writeLibraryView({ set: "", sort: "most-done", shuffle: null });
    turnOn();
    open("b");
    await screen.findByText("All · 2/4");
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
    expect(chip()).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(chip());

    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
    expect(upNextTitles()).toEqual(["C", "Z", "A"]);
    expect(readLibraryView()).toEqual({
      set: "",
      sort: "shuffle",
      shuffle: { listKey: "", order: ["b", "c", "z", "a"], previousSort: "most-done" },
    });

    fireEvent.click(chip());

    expect(chip()).toHaveAttribute("aria-pressed", "false");
    expect(upNextTitles()).toEqual(["C", "Z"]);
    expect(readLibraryView()).toEqual({ set: "", sort: "most-done", shuffle: null });
    expect(fakeYouTube.options).toHaveLength(1);
    expect(fakeYouTube.players[0].loadVideoById).not.toHaveBeenCalled();
  });

  test("a queue that arrives shuffled starts with the chip on and un-shuffles to its saved order", async () => {
    writePlayQueue({ name: "All", exerciseIds: ["c", "a", "b"], source: "library", shuffled: true, unshuffledIds: ["a", "b", "c"] });
    turnOn();
    open("a");
    await screen.findByText("All · 2/3");
    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(upNextTitles()).toEqual(["B"]);

    fireEvent.click(chip());

    expect(upNextTitles()).toEqual(["B", "C"]);
    expect(screen.getByText("All · 1/3")).toBeInTheDocument();
  });

  test("from Today: shuffles only the player and leaves the library alone", async () => {
    turnOn();
    open("a");
    await screen.findByText("Morning · 1/3");

    fireEvent.click(chip());

    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(window.sessionStorage.getItem(LIBRARY_VIEW_STORAGE_KEY)).toBeNull();
  });

  test("works on a one-video queue before anything plays", async () => {
    writePlayQueue({ name: "One", exerciseIds: ["a"] });
    turnOn();
    open("a");
    await screen.findByText("One · 1/1");

    fireEvent.click(chip());

    expect(chip()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
  });
});

describe("shuffle chip keeps the whole list and the handoff in step", () => {
  beforeEach(() => {
    window.sessionStorage.removeItem(LIBRARY_VIEW_STORAGE_KEY);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a filtered library queue shuffles the whole list for the library, the shown part for the player", async () => {
    writePlayQueue({ name: "All", exerciseIds: ["a", "b"], source: "library", shuffled: false, listIds: ["a", "b", "c", "z"] });
    turnOn();
    open("b");
    await screen.findByText("All · 2/2");

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(readLibraryView().shuffle?.order).toEqual(["b", "c", "z", "a"]);
    const upNext = within(screen.getByRole("region", { name: "Up next" })).queryAllByRole("button");
    expect(upNext.map((b) => b.textContent)).toEqual(["A"]);
  });

  test("toggling rewrites the handed-over queue so a reload plays the same order", async () => {
    writePlayQueue({ name: "All", exerciseIds: ["a", "b", "c"], source: "library", shuffled: false, listIds: ["a", "b", "c"] });
    turnOn();
    open("b");
    await screen.findByText("All · 2/3");

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(readPlayQueue()).toMatchObject({ exerciseIds: ["b", "c", "a"], shuffled: true, unshuffledIds: ["a", "b", "c"] });

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(readPlayQueue()).toMatchObject({ exerciseIds: ["a", "b", "c"], shuffled: false });
  });
});

describe("a list that repeats a video", () => {
  const upNextTitles = () =>
    within(screen.getByRole("region", { name: "Up next" }))
      .queryAllByRole("button")
      .map((b) => b.textContent);

  beforeEach(() => {
    writePlayQueue({ name: "Morning", exerciseIds: ["a", "b", "a#2"] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("opening the second copy starts there", async () => {
    turnOn();
    open("a", null, "a#2");

    expect(await screen.findByText("Morning · 3/3")).toBeInTheDocument();
    await waitFor(() => expect(fakeYouTube.options[0]?.videoId).toBe("vid-a"));
  });

  test("copies play in list order", async () => {
    turnOn();
    open("a");
    await screen.findByText("Morning · 1/3");
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));

    finishCurrentVideo();
    await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenLastCalledWith({ videoId: "vid-b" }));
    finishCurrentVideo();
    await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenLastCalledWith({ videoId: "vid-a" }));
    expect(await screen.findByText("Morning · 3/3")).toBeInTheDocument();
  });

  test("up next lists both copies", async () => {
    turnOn();
    open("a");
    await screen.findByText("Morning · 1/3");
    expect(upNextTitles()).toEqual(["B", "A"]);
  });

  test("advancing to the second copy names it in the URL, and going back to the first drops it", async () => {
    turnOn({ loop: true });
    open("b");
    await screen.findByText("Morning · 2/3");

    fireEvent.click(screen.getByRole("button", { name: "Next video" }));
    await screen.findByText("Morning · 3/3");
    expect(window.location.search).toContain("entry=a%232");

    // Loop wraps to the first copy.
    fireEvent.click(screen.getByRole("button", { name: "Next video" }));
    await screen.findByText("Morning · 1/3");
    expect(window.location.search).not.toContain("entry=");
    expect(window.location.search).toContain("exerciseId=a");
  });

  test("shuffle on then off restores the repeated order", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    turnOn();
    open("a");
    await screen.findByText("Morning · 1/3");

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect([...upNextTitles()].sort()).toEqual(["A", "B"]);
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(upNextTitles()).toEqual(["B", "A"]);
    expect(screen.getByText("Morning · 1/3")).toBeInTheDocument();
  });
});

describe("🔂 repeat this video", () => {
  const repeatButton = () => screen.getByRole("button", { name: "Repeat this video" });

  test("shows with the mode off, off at first", async () => {
    open("b");
    await screen.findByRole("button", { name: "Play B" });
    expect(repeatButton()).toHaveAttribute("aria-pressed", "false");
  });

  test("a start/end clip opens with 🔂 on when the mode is off, and keeps repeating", async () => {
    open("k");
    await waitFor(() => expect(repeatButton()).toHaveAttribute("aria-pressed", "true"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Play K" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Play K" }));
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
    finishCurrentVideo();

    await waitFor(() =>
      expect(fakeYouTube.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "vid-k", startSeconds: 10, endSeconds: 20 }),
    );
  });

  test("a clip in continuous play plays once and moves on", async () => {
    writePlayQueue({ name: "Morning", exerciseIds: ["k", "a"] });
    turnOn();
    open("k");
    await screen.findByText("Morning · 1/2");
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
    expect(repeatButton()).toHaveAttribute("aria-pressed", "false");

    finishCurrentVideo();

    await waitFor(() => expect(fakeYouTube.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "vid-a" }));
  });

  test("with auto check: each pass is logged once, a pass logged by hand is not doubled", async () => {
    turnOn({ autoCheck: true });
    open("a");
    await screen.findByText("Morning · 1/3");
    await waitFor(() => expect(fakeYouTube.options).toHaveLength(1));
    fireEvent.click(repeatButton());
    expect(repeatButton()).toHaveAttribute("aria-pressed", "true");

    finishCurrentVideo();
    await waitFor(async () => expect(await logsFor("a")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Did it" }));
    await waitFor(async () => expect(await logsFor("a")).toHaveLength(2));
    finishCurrentVideo();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await logsFor("a")).toHaveLength(2);

    finishCurrentVideo();
    await waitFor(async () => expect(await logsFor("a")).toHaveLength(3));
    expect(screen.getByText("Morning · 1/3")).toBeInTheDocument();
  });
});
