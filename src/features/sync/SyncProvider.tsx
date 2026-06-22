"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { trySilentRefresh, requestSignIn, signOut } from "./google-auth";
import { syncAll } from "./sync-engine";
import type { SyncAllResult, SyncTableResult } from "./sync-engine";

export type SyncStatus =
  | { type: "disconnected" }
  | { type: "syncing"; message: string }
  | { type: "synced"; lastSynced: Date }
  | { type: "error"; message: string; partial: boolean };

interface SyncContextValue {
  status: SyncStatus;
  signIn: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<void>;
  userEmail: string | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({ type: "disconnected" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncNow = useCallback(async () => {
    setStatus({ type: "syncing", message: "Starting sync..." });

    const onProgress = (result: SyncTableResult) => {
      if (!mountedRef.current) return;
      setStatus({
        type: "syncing",
        message: `Synced ${result.tableName} (${result.appended} new rows)`,
      });
    };

    // Get the current token from stored or silent refresh
    const token = await trySilentRefresh();
    if (!token) {
      setStatus({ type: "disconnected" });
      return;
    }

    const result: SyncAllResult = await syncAll(token.accessToken, onProgress);

    if (!mountedRef.current) return;

    const hasError = result.results?.some((r) => r.error);
    if (hasError) {
      const errorMessages = result.results
        .filter((r) => r.error)
        .map((r) => `${r.tableName}: ${r.error}`)
        .join("; ");
      setStatus({
        type: "error",
        message: errorMessages,
        partial: true,
      });
    } else {
      setStatus({ type: "synced", lastSynced: new Date() });
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      const token = await requestSignIn();
      setUserEmail(token.email);
      // Trigger sync after sign-in
      await syncNow();
    } catch {
      setStatus({ type: "disconnected" });
    }
  }, [syncNow]);

  const handleDisconnect = useCallback(async () => {
    await signOut();
    setUserEmail(null);
    setStatus({ type: "disconnected" });
  }, []);

  // On mount, try silent refresh and sync
  useEffect(() => {
    (async () => {
      try {
        const token = await trySilentRefresh();
        if (!token) return;
        setUserEmail(token.email);
        await syncNow();
      } catch {
        // Silent failure on mount
      }
    })();
  }, [syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      signIn: handleSignIn,
      disconnect: handleDisconnect,
      syncNow,
      userEmail,
    }),
    [status, handleSignIn, handleDisconnect, syncNow, userEmail],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}