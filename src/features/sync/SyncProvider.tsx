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
import { useTranslation } from "@/features/i18n/use-translation";
import { trySilentRefresh, requestSignIn, signOut } from "./google-auth";
import { SHEET_TABS } from "./google-sheets";
import type { SheetTab } from "./google-sheets";
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

export { SyncContext };

type TabLabelKey = `sync_tab_${SheetTab | "spreadsheet"}`;

/** Translated label for a sync result's table name (falls back to the raw name). */
function tabLabel(tableName: string, t: ReturnType<typeof useTranslation>["t"]): string {
  const known = (SHEET_TABS as readonly string[]).includes(tableName) || tableName === "spreadsheet";
  return known ? t(`sync_tab_${tableName}` as TabLabelKey) : tableName;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({ type: "disconnected" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const { t } = useTranslation();
  // Kept in a ref so a language switch does not recreate syncNow (and re-run the mount sync).
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncNow = useCallback(async () => {
    setStatus({ type: "syncing", message: tRef.current("sync_status_starting") });

    const onProgress = (result: SyncTableResult) => {
      if (!mountedRef.current) return;
      setStatus({
        type: "syncing",
        message: tRef.current("sync_status_table", {
          table: tabLabel(result.tableName, tRef.current),
          count: result.rowCount,
        }),
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
        .map((r) => `${tabLabel(r.tableName, tRef.current)}: ${r.error}`)
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