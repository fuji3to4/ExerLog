import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { useWakeLock } from "./use-wake-lock";

let sentinel: { release: ReturnType<typeof vi.fn> };
let request: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sentinel = { release: vi.fn(async () => {}) };
  request = vi.fn(async () => sentinel);
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "wakeLock");
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

test("requests a screen lock while active", async () => {
  renderHook(() => useWakeLock(true));
  await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
  expect(request).toHaveBeenCalledTimes(1);
});

test("releases when it becomes inactive", async () => {
  const { rerender } = renderHook((active: boolean) => useWakeLock(active), { initialProps: true });
  await waitFor(() => expect(request).toHaveBeenCalled());

  rerender(false);

  await waitFor(() => expect(sentinel.release).toHaveBeenCalled());
});

test("releases on unmount", async () => {
  const { unmount } = renderHook(() => useWakeLock(true));
  await waitFor(() => expect(request).toHaveBeenCalled());

  unmount();

  await waitFor(() => expect(sentinel.release).toHaveBeenCalled());
});

test("re-requests when the page becomes visible again", async () => {
  renderHook(() => useWakeLock(true));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

test("does nothing without the Wake Lock API", () => {
  Reflect.deleteProperty(navigator, "wakeLock");
  expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
});
