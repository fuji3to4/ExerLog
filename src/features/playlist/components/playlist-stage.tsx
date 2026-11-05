"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import type { UsePlaylist } from "../use-playlist";
import { PlaylistPlayer } from "./playlist-player";

type PlaylistStageProps = {
  playlist: UsePlaylist;
  /** The positioned list element that holds the cards (and this stage). */
  containerRef: RefObject<HTMLElement | null>;
};

/**
 * Holds the one YouTube player for the whole run in a fixed spot in the tree, and lays it
 * over the playing card's `[data-playlist-slot]`. Stops the run if the list is hidden
 * (the page keeps a second, hidden copy of the screen for the other layout).
 */
export function PlaylistStage({ playlist, containerRef }: PlaylistStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(playlist.stop);
  stopRef.current = playlist.stop;
  const current = playlist.current;
  const playId = current?.playId ?? null;

  const place = useCallback(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    const slot = container?.querySelector<HTMLElement>("[data-playlist-slot]");
    if (!container || !stage || !slot) return;
    const outer = container.getBoundingClientRect();
    const inner = slot.getBoundingClientRect();
    stage.style.top = `${inner.top - outer.top}px`;
    stage.style.left = `${inner.left - outer.left}px`;
    stage.style.width = `${inner.width}px`;
    stage.style.height = `${inner.height}px`;
  }, [containerRef]);

  // Cheap enough to re-measure after every render (cards move, counts change).
  useLayoutEffect(() => {
    place();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.addEventListener("resize", place);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        const hidden = entries.some(
          (entry) => entry.target === container && entry.contentRect.width === 0 && entry.contentRect.height === 0,
        );
        if (hidden) {
          stopRef.current();
          return;
        }
        place();
      });
      observer.observe(container);
      const slot = container.querySelector("[data-playlist-slot]");
      if (slot) observer.observe(slot);
    }

    return () => {
      window.removeEventListener("resize", place);
      observer?.disconnect();
    };
    // Re-observe when the slot moves to another card.
  }, [containerRef, place, playId]);

  if (!current) {
    return null;
  }

  return (
    <div ref={stageRef} className="playlist-stage">
      <PlaylistPlayer
        clip={current.clip}
        playId={current.playId}
        title={current.exercise.title}
        onEnded={playlist.handleEnded}
      />
    </div>
  );
}
