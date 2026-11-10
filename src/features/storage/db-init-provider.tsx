"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { loadCustomTypes } from "@/features/modules/custom/type-store";

type DbInitProviderProps = {
  children: ReactNode;
};

export function DbInitProvider({ children }: DbInitProviderProps) {
  useEffect(() => {
    // Ask the browser not to evict this device's data (photos live only here
    // until synced). Best effort: a missing API or a refusal changes nothing.
    // Load custom record types without blocking render; subscribers redraw.
    void loadCustomTypes().catch(console.error);

    try {
      void navigator.storage?.persist?.()?.catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  return <>{children}</>;
}
