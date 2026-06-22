"use client";

import { useTranslation } from "@/features/i18n/use-translation";

import { DataManagement } from "./data-management";
import { GoogleDriveSettings } from "./google-drive-settings";
import { LibraryManagement } from "./library-management";

export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <>
      <section className="card page-header">
        <h1>{t("settings_heading")}</h1>
      </section>

      <section className="card settings-section">
        <h2>{t("settings_library_section_heading")}</h2>
        <LibraryManagement />
      </section>

      <section className="card settings-section">
        <h2>{t("settings_data_section_heading")}</h2>
        <DataManagement />
      </section>

      <section className="card settings-section">
        <h2>Google Drive</h2>
        <GoogleDriveSettings />
      </section>
    </>
  );
}
