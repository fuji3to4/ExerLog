"use client";

import { useState, useCallback, useEffect } from "react";
import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";

export function SyncIndicator() {
  const { status, userEmail, signIn, disconnect } = useSync();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    if (status.type === "disconnected") {
      void signIn();
    } else {
      setOpen((prev) => !prev);
    }
  }, [status.type, signIn]);

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    void disconnect();
  }, [disconnect]);

  const isConnected = status.type !== "disconnected";

  // Close dropdown on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={status.type === "syncing"}
        aria-label={
          status.type === "disconnected"
            ? t("sync_indicator_sign_in")
            : status.type === "syncing"
              ? t("sync_indicator_syncing")
              : status.type === "error"
                ? t("sync_indicator_error")
                : userEmail?.trim()
                  ? userEmail
                  : t("sync_indicator_synced")
        }
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {status.type === "syncing" ? (
          "🔄"
        ) : status.type === "error" ? (
          "⚠️"
        ) : isConnected ? (
          <>
            🔒
            <span className="hidden sm:inline max-w-[100px] truncate">
              {userEmail}
            </span>
          </>
        ) : (
          "🔓"
        )}
      </button>

      {open && isConnected && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[160px] rounded-lg border border-border bg-card p-2 shadow-lg">
            {status.type === "error" && (
              <p className="px-3 py-2 text-xs text-destructive">
                {status.message}
              </p>
            )}
            {userEmail && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                {userEmail}
              </p>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full rounded-md px-3 py-2 text-xs font-semibold text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t("sync_indicator_disconnect")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}