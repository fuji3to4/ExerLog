"use client";

import { SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type { UsePlaylist } from "../use-playlist";

/**
 * The playing card's media: an empty 16:9 slot that PlaylistStage lays the player over,
 * with ⏮ / ⏭ under it. The player itself never lives inside a card, so moving to the next
 * card does not create a new iframe.
 */
export function PlaylistSlot({ playlist }: { playlist: UsePlaylist }) {
  const { t } = useTranslation();

  return (
    <div className="playlist-now-playing">
      <div className="playlist-slot" data-playlist-slot="" />
      <div className="playlist-now-playing__buttons">
        <Button size="icon" className="rounded-full" aria-label={t("playlist_previous_aria")} onClick={playlist.previous}>
          <SkipBack aria-hidden="true" size={18} />
        </Button>
        <Button size="icon" className="rounded-full" aria-label={t("playlist_next_aria")} onClick={playlist.next}>
          <SkipForward aria-hidden="true" size={18} />
        </Button>
      </div>
    </div>
  );
}
