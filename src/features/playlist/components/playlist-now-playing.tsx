"use client";

import { SkipBack, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type { UsePlaylist } from "../use-playlist";
import { PlaylistPlayer } from "./playlist-player";

/** The playing card's media: the inline player with ⏮ / ⏭ under it. */
export function PlaylistNowPlaying({ playlist }: { playlist: UsePlaylist }) {
  const { t } = useTranslation();
  const { current } = playlist;

  if (!current) {
    return null;
  }

  return (
    <div className="playlist-now-playing">
      <PlaylistPlayer
        clip={current.clip}
        playId={current.playId}
        title={current.exercise.title}
        onEnded={playlist.handleEnded}
      />
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
