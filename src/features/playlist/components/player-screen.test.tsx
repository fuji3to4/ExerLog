import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

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

import { PLAY_QUEUE_STORAGE_KEY, writePlayQueue } from "../play-queue-store";
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

const drafts = [draft("a"), draft("b"), draft("c"), draft("z"), draft("web", "https://example.com/web.mp4")];

function open(id: string, logDate: string | null = null) {
  window.history.replaceState({}, "", `/exercises?exerciseId=${id}`);
  const exercise = asVideo(drafts.find((d) => d.id === id)!);
  return renderWithLanguage(
    <CelebrationProvider>
      <PlayerScreen exercise={exercise} logDate={logDate} />
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
