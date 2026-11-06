import { renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";

import {
  PLAY_QUEUE_STORAGE_KEY,
  readPlayQueue,
  resolvePlayQueue,
  usePublishPlayQueue,
  writePlayQueue,
  type PlayQueue,
} from "./play-queue-store";

beforeEach(() => {
  window.sessionStorage.removeItem(PLAY_QUEUE_STORAGE_KEY);
});

test("round-trips the queue", () => {
  writePlayQueue({ name: "Morning", exerciseIds: ["a", "b"] });
  expect(readPlayQueue()).toEqual({ name: "Morning", exerciseIds: ["a", "b"] });
});

test("invalid stored data reads as no queue", () => {
  window.sessionStorage.setItem(PLAY_QUEUE_STORAGE_KEY, "{oops");
  expect(readPlayQueue()).toBeNull();
  window.sessionStorage.setItem(PLAY_QUEUE_STORAGE_KEY, '{"name":1}');
  expect(readPlayQueue()).toBeNull();
});

test("resolvePlayQueue returns the queue only when it contains the exercise", () => {
  writePlayQueue({ name: "Morning", exerciseIds: ["a", "b"] });
  expect(resolvePlayQueue("b")).toEqual({ name: "Morning", exerciseIds: ["a", "b"] });
  expect(resolvePlayQueue("z")).toBeNull();
});

test("usePublishPlayQueue writes on mount and when the ids change; null writes nothing", () => {
  const { rerender } = renderHook((queue: PlayQueue | null) => usePublishPlayQueue(queue), {
    initialProps: null as PlayQueue | null,
  });
  expect(readPlayQueue()).toBeNull();

  rerender({ name: "All", exerciseIds: ["a", "b"] });
  expect(readPlayQueue()).toEqual({ name: "All", exerciseIds: ["a", "b"] });

  rerender({ name: "All", exerciseIds: ["b", "a"] });
  expect(readPlayQueue()?.exerciseIds).toEqual(["b", "a"]);
});

test("round-trips the source and shuffle fields", () => {
  const queue: PlayQueue = { name: "x", exerciseIds: ["b", "a"], source: "library", shuffled: true, unshuffledIds: ["a", "b"] };
  writePlayQueue(queue);
  expect(readPlayQueue()).toEqual(queue);
});

test("drops malformed shuffle fields but keeps the queue", () => {
  window.sessionStorage.setItem(
    PLAY_QUEUE_STORAGE_KEY,
    JSON.stringify({ name: "x", exerciseIds: ["a"], source: "elsewhere", shuffled: "yes", unshuffledIds: [1] }),
  );
  expect(readPlayQueue()).toEqual({ name: "x", exerciseIds: ["a"] });
});

test("republishes when only the shuffle state changes", () => {
  const { rerender } = renderHook((queue: PlayQueue) => usePublishPlayQueue(queue), {
    initialProps: { name: "x", exerciseIds: ["a", "b"], source: "library" as const, shuffled: false },
  });
  rerender({ name: "x", exerciseIds: ["a", "b"], source: "library", shuffled: true, unshuffledIds: ["b", "a"] });
  expect(readPlayQueue()).toEqual({ name: "x", exerciseIds: ["a", "b"], source: "library", shuffled: true, unshuffledIds: ["b", "a"] });
});
