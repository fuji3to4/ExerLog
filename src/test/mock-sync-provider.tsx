import type { ReactNode } from "react";

import { SyncContext } from "@/features/sync/SyncProvider";

/** A signed-out sync context, for rendering the app shell without Google Drive. */
export function mockSyncContext() {
  return {
    status: { type: "disconnected" as const },
    signIn: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    userEmail: null,
  };
}

export function MockSyncProvider({ children }: { children: ReactNode }) {
  return <SyncContext.Provider value={mockSyncContext()}>{children}</SyncContext.Provider>;
}
