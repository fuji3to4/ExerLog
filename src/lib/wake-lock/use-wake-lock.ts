"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = { release(): Promise<void> };
type WakeLockLike = { request(type: "screen"): Promise<WakeLockSentinelLike> };

function getWakeLock(): WakeLockLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock ?? null;
}

/**
 * Keeps the screen on while `active`. The browser drops the lock whenever the page is hidden,
 * so it is requested again each time the page becomes visible. No-op where unsupported.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = getWakeLock();
    if (!active || !wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    async function acquire() {
      try {
        const next = await wakeLock!.request("screen");
        if (disposed) {
          void next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch (error) {
        console.warn("Screen wake lock was not granted", error);
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
