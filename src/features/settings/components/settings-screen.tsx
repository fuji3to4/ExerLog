"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";

import { DataManagement } from "./data-management";
import { GoogleDriveSettings } from "./google-drive-settings";
import { LibraryManagement } from "./library-management";

export function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 lg:items-center">
      <Card className="page-header w-full lg:max-w-[400px]">
        <CardHeader>
          <CardTitle>{t("settings_heading")}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="settings-section w-full lg:max-w-[400px]">
        <CardHeader>
          <CardTitle>{t("settings_library_section_heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LibraryManagement />
        </CardContent>
      </Card>

      <Card className="settings-section w-full lg:max-w-[400px]">
        <CardHeader>
          <CardTitle>{t("settings_data_section_heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataManagement />
        </CardContent>
      </Card>

      <Card className="settings-section w-full lg:max-w-[400px]">
        <CardHeader>
          <CardTitle>{t("settings_google_drive_section_heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleDriveSettings />
        </CardContent>
      </Card>
    </div>
  );
}
