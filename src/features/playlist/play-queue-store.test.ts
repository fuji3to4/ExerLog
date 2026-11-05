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
