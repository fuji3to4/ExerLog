"use client";

import { useEffect, useRef } from "react";

import { loadYouTubeIframeApi, type YTPlayer } from "@/lib/video/youtube-iframe-api";
import type { YouTubeClip } from "@/lib/video/youtube";

type PlaylistPlayerProps = {
  clip: YouTubeClip;
  /** Changes whenever a (possibly identical) video should start from the top. */
  playId: number;
  title: string;
  onEnded: () => void;
};

function playerVarsFor(clip: YouTubeClip): Record<string, number> {
  const vars: Record<string, number> = { autoplay: 1, playsinline: 1, rel: 0 };
  if (clip.startSeconds !== undefined) vars.start = clip.startSeconds;
  if (clip.endSeconds !== undefined) vars.end = clip.endSeconds;
  return vars;
}

/**
 * One YouTube player for the whole run. Later videos are swapped in with `loadVideoById`
 * instead of a new iframe, because mobile browsers may block autoplay in a fresh iframe.
 */
export function PlaylistPlayer({ clip, playId, title, onEnded }: PlaylistPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const loadedPlayIdRef = useRef(playId);
  const latest = useRef({ clip, playId, onEnded });
  latest.current = { clip, playId, onEnded };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    // The API replaces the element it is given with an iframe, so give it one React doesn't own.
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled) return;
        const { clip: firstClip, playId: firstPlayId } = latest.current;
        loadedPlayIdRef.current = firstPlayId;
        playerRef.current = new YT.Player(mount, {
          videoId: firstClip.videoId,
          playerVars: playerVarsFor(firstClip),
          events: {
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) {
                latest.current.onEnded();
              }
            },
          },
        });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || loadedPlayIdRef.current === playId) return;
    loadedPlayIdRef.current = playId;
    player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.startSeconds, endSeconds: clip.endSeconds });
  }, [playId, clip]);

  return <div ref={hostRef} className="playlist-player" aria-label={title} role="region" />;
}
