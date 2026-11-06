"use client";

import { useEffect, useRef } from "react";

import { loadYouTubeIframeApi, type YTPlayer } from "@/lib/video/youtube-iframe-api";
import type { YouTubeClip } from "@/lib/video/youtube";

type PlaylistPlayerProps = {
  clip: YouTubeClip;
  /** Changes whenever a (possibly identical) video should start from the top. */
  playId: number;
  title: string;
  /** Called with the playId that was loaded when the video really ended. */
  onEnded: (playId: number) => void;
  /** Called with the loaded playId when YouTube cannot play it (removed, private, embedding off). */
  onError?: (playId: number) => void;
  /** Called once per playId when it was really watched: 15 s of playing, or played to its end. */
  onWatched?: (playId: number) => void;
};

const PLAYING = 1;
/** Playing time before a video counts as watched, so a quick skip leaves no watch. */
export const WATCHED_AFTER_MS = 15_000;

/**
 * Counts the loaded video's playing time (paused or buffering time does not count) and calls
 * `onWatched` once when it reaches WATCHED_AFTER_MS, or when `finish` is called first.
 */
function createWatchClock(onWatched: () => void) {
  let playedMs = 0;
  let playingSince: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let reported = false;

  function pause() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (playingSince !== null) playedMs += Date.now() - playingSince;
    playingSince = null;
  }

  function finish() {
    pause();
    if (reported) return;
    reported = true;
    onWatched();
  }

  return {
    start() {
      if (reported || playingSince !== null) return;
      playingSince = Date.now();
      timer = setTimeout(finish, Math.max(0, WATCHED_AFTER_MS - playedMs));
    },
    pause,
    finish,
    /** A new video was loaded: start counting from zero. */
    reset() {
      pause();
      playedMs = 0;
      reported = false;
    },
  };
}

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
export function PlaylistPlayer({ clip, playId, title, onEnded, onError, onWatched }: PlaylistPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const loadedPlayIdRef = useRef(playId);
  // An ENDED counts only after the loaded video was seen playing, so duplicate or late
  // events (e.g. from the previous video right after a swap) are dropped.
  const sawPlayingRef = useRef(false);
  const latest = useRef({ clip, playId, onEnded, onError, onWatched });
  latest.current = { clip, playId, onEnded, onError, onWatched };

  const watchClockRef = useRef<ReturnType<typeof createWatchClock> | null>(null);
  watchClockRef.current ??= createWatchClock(() => latest.current.onWatched?.(loadedPlayIdRef.current));

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
        sawPlayingRef.current = false;
        watchClockRef.current?.reset();
        playerRef.current = new YT.Player(mount, {
          videoId: firstClip.videoId,
          playerVars: playerVarsFor(firstClip),
          events: {
            onStateChange: (event) => {
              if (event.data === PLAYING) {
                sawPlayingRef.current = true;
                watchClockRef.current?.start();
              } else if (event.data === YT.PlayerState.ENDED && sawPlayingRef.current) {
                sawPlayingRef.current = false;
                // A clip shorter than the threshold still counts once it plays to its end.
                watchClockRef.current?.finish();
                latest.current.onEnded(loadedPlayIdRef.current);
              } else {
                watchClockRef.current?.pause();
              }
            },
            onError: () => {
              latest.current.onError?.(loadedPlayIdRef.current);
            },
          },
        });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      watchClockRef.current?.pause();
      playerRef.current?.destroy();
      playerRef.current = null;
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || loadedPlayIdRef.current === playId) return;
    loadedPlayIdRef.current = playId;
    sawPlayingRef.current = false;
    watchClockRef.current?.reset();
    const args: { videoId: string; startSeconds?: number; endSeconds?: number } = { videoId: clip.videoId };
    if (clip.startSeconds !== undefined) args.startSeconds = clip.startSeconds;
    if (clip.endSeconds !== undefined) args.endSeconds = clip.endSeconds;
    player.loadVideoById(args);
  }, [playId, clip]);

  return <div ref={hostRef} className="playlist-player" aria-label={title} role="region" />;
}
