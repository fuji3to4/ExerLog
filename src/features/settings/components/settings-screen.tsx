"use client";

import { useTranslation } from "@/features/i18n/use-translation";

import { DataManagement } from "./data-management";
import { GoogleDriveSettings } from "./google-drive-settings";
import { LibraryManagement } from "./library-management";

export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 lg:items-center">
      <section className="card page-header w-full lg:max-w-[400px]">
        <h1>{t("settings_heading")}</h1>
      </section>

      <section className="card settings-section w-full lg:max-w-[400px]">
        <h2>{t("settings_library_section_heading")}</h2>
        <LibraryManagement />
      </section>

      <section className="card settings-section w-full lg:max-w-[400px]">
        <h2>{t("settings_data_section_heading")}</h2>
        <DataManagement />
      </section>

      <section className="card settings-section w-full lg:max-w-[400px]">
        <h2>{t("settings_google_drive_section_heading")}</h2>
        <GoogleDriveSettings />
      </section>
    </div>
  );
}
