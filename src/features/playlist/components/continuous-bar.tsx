"use client";

import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";

import type { UsePlaylist } from "../use-playlist";

/** The 連続再生 switch, shown at the right of the back row. */
export function ContinuousSwitch({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <label className="continuous-switch">
      <span aria-hidden="true">{t("playlist_mode")}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={t("playlist_mode")} />
    </label>
  );
}

/** One small line while the mode is on: "{list} · n/total" plus the loop and auto-check chips. */
export function ContinuousStatus({ playlist, position }: { playlist: UsePlaylist; position: string | null }) {
  const { t } = useTranslation();
  const { settings } = playlist;

  return (
    <div className="continuous-status">
      {position ? <span className="continuous-status__position">{position}</span> : null}
      <button
        type="button"
        className={cn("continuous-status__chip", settings.loop && "is-on")}
        aria-pressed={settings.loop}
        onClick={() => playlist.setLoop(!settings.loop)}
      >
        <span aria-hidden="true">🔁 </span>
        {t("playlist_loop")}
      </button>
      <button
        type="button"
        className={cn("continuous-status__chip", settings.autoCheck && "is-on")}
        aria-pressed={settings.autoCheck}
        onClick={() => playlist.setAutoCheck(!settings.autoCheck)}
      >
        <span aria-hidden="true">✓ </span>
        {t("playlist_auto_check")}
      </button>
    </div>
  );
}
