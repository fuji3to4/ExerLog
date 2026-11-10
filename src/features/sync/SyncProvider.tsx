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
import { onRefreshSignedOut, trySilentRefresh, requestSignIn, signOut } from "./google-auth";
import { isMessageKey } from "@/features/i18n/messages";
import { customTabName } from "@/features/modules/custom/data";
import { resolveText } from "@/features/modules/custom/definition";
import { getCustomTypes } from "@/features/modules/custom/type-store";
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

/**
 * Translated label for a sync result's table name: a custom type's tab shows the
 * type's name in the display language; anything unknown falls back to the raw name.
 */
function tabLabel(
  tableName: string,
  t: ReturnType<typeof useTranslation>["t"],
  language: string,
): string {
  const customType = getCustomTypes().find((type) => customTabName(type.id) === tableName);
  if (customType) return resolveText(customType.definition.name, language) || tableName;
  const key = `sync_tab_${tableName}`;
  return isMessageKey(key) ? t(key) : tableName;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({ type: "disconnected" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const { t, language } = useTranslation();
  // Kept in refs so a language switch does not recreate syncNow (and re-run the mount sync).
  const tRef = useRef(t);
  tRef.current = t;
  const languageRef = useRef(language);
  languageRef.current = language;

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
          table: tabLabel(result.tableName, tRef.current, languageRef.current),
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
        .map((r) => `${tabLabel(r.tableName, tRef.current, languageRef.current)}: ${r.error}`)
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

  // A background refresh can end the connection (popup closed); show it right away.
  useEffect(
    () =>
      onRefreshSignedOut(() => {
        if (!mountedRef.current) return;
        setUserEmail(null);
        setStatus({ type: "disconnected" });
      }),
    [],
  );

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