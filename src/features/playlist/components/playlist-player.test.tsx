import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

type PlayerOptions = {
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: { onStateChange?: (event: { data: number }) => void };
};

const fake = vi.hoisted(() => ({
  constructed: [] as PlayerOptions[],
  players: [] as { loadVideoById: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[],
}));

vi.mock("@/lib/video/youtube-iframe-api", () => ({
  loadYouTubeIframeApi: () =>
    Promise.resolve({
      PlayerState: { ENDED: 0 },
      Player: function Player(_el: HTMLElement, options: PlayerOptions) {
        fake.constructed.push(options);
        const player = { loadVideoById: vi.fn(), destroy: vi.fn() };
        fake.players.push(player);
        return player;
      },
    }),
}));

import { PlaylistPlayer } from "./playlist-player";

beforeEach(() => {
  fake.constructed.length = 0;
  fake.players.length = 0;
});

test("creates one autoplaying player for the first clip", async () => {
  render(<PlaylistPlayer clip={{ videoId: "a", startSeconds: 5 }} playId={1} title="A" onEnded={() => {}} />);

  await waitFor(() => expect(fake.constructed).toHaveLength(1));
  expect(fake.constructed[0].videoId).toBe("a");
  expect(fake.constructed[0].playerVars?.autoplay).toBe(1);
  expect(fake.constructed[0].playerVars?.start).toBe(5);
});

test("a new playId swaps the video in the same player", async () => {
  const { rerender } = render(<PlaylistPlayer clip={{ videoId: "a" }} playId={1} title="A" onEnded={() => {}} />);
  await waitFor(() => expect(fake.constructed).toHaveLength(1));

  rerender(<PlaylistPlayer clip={{ videoId: "b", startSeconds: 10, endSeconds: 40 }} playId={2} title="B" onEnded={() => {}} />);

  await waitFor(() =>
    expect(fake.players[0].loadVideoById).toHaveBeenCalledWith({ videoId: "b", startSeconds: 10, endSeconds: 40 }),
  );
  expect(fake.constructed).toHaveLength(1);
});

test("ENDED after PLAYING reports the loaded playId; other states do not", async () => {
  const onEnded = vi.fn();
  render(<PlaylistPlayer clip={{ videoId: "a" }} playId={3} title="A" onEnded={onEnded} />);
  await waitFor(() => expect(fake.constructed).toHaveLength(1));

  act(() => fake.constructed[0].events?.onStateChange?.({ data: 1 }));
  expect(onEnded).not.toHaveBeenCalled();

  act(() => fake.constructed[0].events?.onStateChange?.({ data: 0 }));
  expect(onEnded).toHaveBeenCalledTimes(1);
  expect(onEnded).toHaveBeenCalledWith(3);
});

test("an ENDED that was not preceded by PLAYING since the last load is ignored", async () => {
  const onEnded = vi.fn();
  const { rerender } = render(<PlaylistPlayer clip={{ videoId: "a" }} playId={1} title="A" onEnded={onEnded} />);
  await waitFor(() => expect(fake.constructed).toHaveLength(1));
  const fire = (data: number) => act(() => fake.constructed[0].events?.onStateChange?.({ data }));

  fire(1);
  fire(0);
  fire(0); // duplicate for the same video
  rerender(<PlaylistPlayer clip={{ videoId: "b" }} playId={2} title="B" onEnded={onEnded} />);
  await waitFor(() => expect(fake.players[0].loadVideoById).toHaveBeenCalled());
  fire(0); // late ENDED from the previous video, after the swap

  expect(onEnded).toHaveBeenCalledTimes(1);
  expect(onEnded).toHaveBeenCalledWith(1);
});

test("unmount destroys the player", async () => {
  const { unmount } = render(<PlaylistPlayer clip={{ videoId: "a" }} playId={1} title="A" onEnded={() => {}} />);
  await waitFor(() => expect(fake.constructed).toHaveLength(1));

  unmount();
  expect(fake.players[0].destroy).toHaveBeenCalled();
});
