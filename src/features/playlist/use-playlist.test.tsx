import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const watch = vi.hoisted(() => ({ recordWatchEvent: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@/features/storage/watch-events.repository", () => watch);

import type { ExerciseVideo } from "@/lib/types";

import { PLAYLIST_SETTINGS_STORAGE_KEY } from "./playlist-settings-store";
import { usePlaylist } from "./use-playlist";

function video(id: string, videoUrl = `https://youtu.be/${id}`): ExerciseVideo {
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
    updatedAt: "",
  };
}

const abc = [video("a"), video("b"), video("c")];

function setup(exercises = abc) {
  const onFinished = vi.fn();
  const hook = renderHook((props: { exercises: ExerciseVideo[] }) => usePlaylist({ ...props, onFinished }), {
    initialProps: { exercises },
  });
  return { ...hook, onFinished };
}

beforeEach(() => {
  window.localStorage.removeItem(PLAYLIST_SETTINGS_STORAGE_KEY);
  watch.recordWatchEvent.mockClear();
});

test("only embeddable videos are queued", () => {
  const { result } = setup([video("a"), video("x", "https://vimeo.com/1"), video("b")]);
  expect(result.current.items.map((item) => item.exercise.id)).toEqual(["a", "b"]);
});

test("start plays the first video and records a watch per video", async () => {
  const { result } = setup();

  act(() => result.current.start());
  expect(result.current.isPlaying).toBe(true);
  expect(result.current.current?.exercise.id).toBe("a");
  await waitFor(() => expect(watch.recordWatchEvent).toHaveBeenCalledWith({ exerciseId: "a" }));

  act(() => result.current.next());
  expect(result.current.current?.exercise.id).toBe("b");
  await waitFor(() => expect(watch.recordWatchEvent).toHaveBeenCalledWith({ exerciseId: "b" }));
  expect(watch.recordWatchEvent).toHaveBeenCalledTimes(2);
});

test("start with an id jumps to that video; an unknown id does nothing", () => {
  const { result } = setup();

  act(() => result.current.start("c"));
  expect(result.current.current?.exercise.id).toBe("c");

  act(() => result.current.start("nope"));
  expect(result.current.current?.exercise.id).toBe("c");
});

test("with auto-check, an ended video is reported once and the next one plays", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());

  act(() => result.current.handleEnded(result.current.current?.playId ?? 1));

  expect(onFinished).toHaveBeenCalledTimes(1);
  expect(onFinished).toHaveBeenCalledWith(abc[0]);
  expect(result.current.current?.exercise.id).toBe("b");
});

test("a duplicate ENDED for the same video is reported once", () => {
  const { result, onFinished } = setup([video("a")]);
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());
  const playId = result.current.current!.playId;

  act(() => result.current.handleEnded(playId));
  act(() => result.current.handleEnded(playId));

  expect(onFinished).toHaveBeenCalledTimes(1);
});

test("ENDED after stop is not reported", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());

  act(() => result.current.stop());
  act(() => result.current.handleEnded(result.current.current?.playId ?? 1));

  expect(onFinished).not.toHaveBeenCalled();
  expect(result.current.isPlaying).toBe(false);
});

test("turning auto-check off mid-video means it is not reported", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());

  act(() => result.current.setAutoCheck(false));
  act(() => result.current.handleEnded(result.current.current?.playId ?? 1));

  expect(onFinished).not.toHaveBeenCalled();
  expect(result.current.current?.exercise.id).toBe("b");
});

test("skipping never reports", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());

  act(() => result.current.next());
  act(() => result.current.start("a"));

  expect(onFinished).not.toHaveBeenCalled();
});

test("playback stops when the playing video drops out of the list", () => {
  const { result, rerender } = setup();
  act(() => result.current.start("c"));

  rerender({ exercises: [video("a"), video("b")] });

  expect(result.current.isPlaying).toBe(false);
});

test("loop setting persists", () => {
  const { result } = setup();
  act(() => result.current.setLoop(true));

  expect(result.current.settings.loop).toBe(true);
  expect(JSON.parse(window.localStorage.getItem(PLAYLIST_SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({ loop: true });
});

test("a setting changed in one screen copy shows up in another mounted copy", () => {
  const first = setup();
  const second = setup();
  act(() => first.result.current.setContinuous(false));

  act(() => first.result.current.setAutoCheck(true));

  expect(second.result.current.settings.autoCheck).toBe(true);
});

test("playing the list again after stop still reports and advances", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());
  act(() => result.current.handleEnded(result.current.current!.playId));
  act(() => result.current.stop());

  act(() => result.current.start());
  act(() => result.current.handleEnded(result.current.current!.playId));

  expect(onFinished).toHaveBeenCalledTimes(2);
  expect(result.current.current?.exercise.id).toBe("b");
});

test("an ENDED for a playId that is no longer current is ignored", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());
  const firstPlayId = result.current.current!.playId;
  act(() => result.current.handleEnded(firstPlayId));

  act(() => result.current.handleEnded(firstPlayId));

  expect(onFinished).toHaveBeenCalledTimes(1);
  expect(result.current.current?.exercise.id).toBe("b");
});

test("mode off: a bounded clip restarts itself on end", () => {
  const { result, onFinished } = setup([video("a", "https://youtu.be/a?start=5&end=20"), video("b")]);
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());
  const firstPlayId = result.current.current!.playId;

  act(() => result.current.handleEnded(firstPlayId));

  expect(result.current.current?.exercise.id).toBe("a");
  expect(result.current.current?.playId).toBeGreaterThan(firstPlayId);
  expect(onFinished).not.toHaveBeenCalled();
});

test("turning continuous off mid-video: an unbounded video stops at its end", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());
  const playId = result.current.current!.playId;

  act(() => result.current.setContinuous(false));
  act(() => result.current.handleEnded(playId));

  expect(result.current.current?.exercise.id).toBe("a");
  expect(result.current.current?.playId).toBe(playId);
  expect(onFinished).not.toHaveBeenCalled();
});

test("a manual log during a play suppresses its auto log", () => {
  const { result, onFinished } = setup();
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.start());

  act(() => result.current.markManualLog());
  act(() => result.current.handleEnded(result.current.current!.playId));

  expect(onFinished).not.toHaveBeenCalled();
  expect(result.current.current?.exercise.id).toBe("b");
});

test("manual log suppression is per play", () => {
  const { result, onFinished } = setup([video("a")]);
  act(() => result.current.setContinuous(true));
  act(() => result.current.setAutoCheck(true));
  act(() => result.current.setLoop(true));
  act(() => result.current.start());

  act(() => result.current.markManualLog());
  act(() => result.current.handleEnded(result.current.current!.playId));
  act(() => result.current.handleEnded(result.current.current!.playId));

  expect(onFinished).toHaveBeenCalledTimes(1);
});

test("setContinuous persists", () => {
  const { result } = setup();
  act(() => result.current.setContinuous(true));

  expect(result.current.settings.continuous).toBe(true);
  expect(JSON.parse(window.localStorage.getItem(PLAYLIST_SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({ continuous: true });
});
