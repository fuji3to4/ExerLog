"use client";

import { Camera } from "lucide-react";
import { useId } from "react";

import { Switch } from "@/components/ui/switch";
import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";
import { usePhotoSyncEnabled } from "@/features/modules/photo/photo-sync-setting";

/** A setting row in the same shape as the record-module rows: label and note on the left, switch on the right. */
function PhotoSyncSetting() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = usePhotoSyncEnabled();
  const labelId = useId();
  const noteId = useId();
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <Camera aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-sm">
        <span id={labelId} className="block font-medium">
          {t("settings_photo_sync_label")}
        </span>
        <span id={noteId} className="block text-xs text-muted-foreground">
          {t("settings_photo_sync_note")}
        </span>
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-labelledby={labelId}
        aria-describedby={noteId}
      />
    </div>
  );
}

export function GoogleDriveSettings() {
  const { status, signIn, disconnect, syncNow, userEmail } = useSync();
  const { t } = useTranslation();

  if (status.type === "disconnected") {
    return (
      <div className="data-management__group">
        <h3 className="data-management__group-heading">
          {t("settings_google_drive_heading")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings_google_drive_description")}
        </p>
        <PhotoSyncSetting />
        <div className="data-management__buttons">
          <button
            type="button"
            className="settings-action-button"
            onClick={() => void signIn()}
          >
            {t("settings_google_drive_sign_in")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="data-management__group">
      <h3 className="data-management__group-heading">
        {t("settings_google_drive_heading")}
      </h3>

      {status.type === "syncing" && (
        <p className="data-management__status">
          {t("settings_google_drive_syncing")}
        </p>
      )}

      {status.type === "synced" && (
        <>
          <p className="data-management__status">
            ✅ {userEmail}
          </p>
          <p className="data-management__status">
            {t("settings_google_drive_last_synced")}:{" "}
            {status.lastSynced.toLocaleString()}
          </p>
        </>
      )}

      {status.type === "error" && (
        <p className="data-management__status data-management__status--error">
          ❌ {status.message}
        </p>
      )}

      <PhotoSyncSetting />
      <div className="data-management__buttons">
        <button
          type="button"
          className="settings-action-button"
          onClick={() => void syncNow()}
          disabled={status.type === "syncing"}
        >
          {t("settings_google_drive_sync_now")}
        </button>
        <button
          type="button"
          className="settings-action-button settings-action-button--secondary"
          onClick={() => void disconnect()}
        >
          {t("settings_google_drive_disconnect")}
        </button>
      </div>
    </div>
  );
}