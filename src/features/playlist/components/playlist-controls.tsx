"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";

import type { UsePlaylist } from "../use-playlist";

/** "▶ Play all" / "■ Stop" plus the loop and auto-check toggles, shown above a my-list. */
export function PlaylistControls({ playlist }: { playlist: UsePlaylist }) {
  const { t } = useTranslation();
  const { isPlaying, settings } = playlist;

  return (
    <div className="playlist-controls" role="group" aria-label={t("playlist_controls_aria")}>
      <Button onClick={() => (isPlaying ? playlist.stop() : playlist.start())}>
        {isPlaying ? t("playlist_stop") : t("playlist_start")}
      </Button>
      <button
        type="button"
        className={cn("playlist-controls__toggle", settings.loop && "is-on")}
        aria-pressed={settings.loop}
        onClick={() => playlist.setLoop(!settings.loop)}
      >
        {t("playlist_loop")}
      </button>
      <button
        type="button"
        className={cn("playlist-controls__toggle", settings.autoCheck && "is-on")}
        aria-pressed={settings.autoCheck}
        onClick={() => playlist.setAutoCheck(!settings.autoCheck)}
      >
        {t("playlist_auto_check")}
      </button>
    </div>
  );
}
