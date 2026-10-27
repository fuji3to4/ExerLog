"use client";

import { useSync } from "@/features/sync/SyncProvider";
import { useTranslation } from "@/features/i18n/use-translation";
import { usePhotoSyncEnabled } from "@/features/modules/photo/photo-sync-setting";

function PhotoSyncCheckbox() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = usePhotoSyncEnabled();
  return (
    <>
      <label className="data-management__status">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        {t("settings_photo_sync_label")}
      </label>
      <p className="data-management__status">{t("settings_photo_sync_note")}</p>
    </>
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
        <p className="data-management__status">
          {t("settings_google_drive_description")}
        </p>
        <PhotoSyncCheckbox />
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

      <PhotoSyncCheckbox />
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