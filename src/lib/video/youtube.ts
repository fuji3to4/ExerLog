import type { ExerciseVideo } from "@/lib/types";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const match = url.pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
    return match?.[2] ?? null;
  } catch {
    return null;
  }
}

export type YouTubeClip = { videoId: string; startSeconds?: number; endSeconds?: number };

function readSeconds(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** The video id plus the optional start/end bounds a playlist player needs. */
export function getYouTubeClip(rawUrl: string): YouTubeClip | null {
  const videoId = getYouTubeVideoId(rawUrl);

  if (!videoId) {
    return null;
  }

  const params = new URL(rawUrl).searchParams;
  const clip: YouTubeClip = { videoId };
  const startSeconds = readSeconds(params.get("start"));
  const endSeconds = readSeconds(params.get("end"));

  if (startSeconds !== undefined) {
    clip.startSeconds = startSeconds;
  }
  if (endSeconds !== undefined) {
    clip.endSeconds = endSeconds;
  }

  return clip;
}

export function getYouTubeThumbnailUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);

  if (!videoId) {
    return null;
  }

  const sourceParams = new URL(rawUrl).searchParams;
  const start = sourceParams.get("start");
  const end = sourceParams.get("end");

  const embedParams = new URLSearchParams({ autoplay: "1" });

  if (start) {
    embedParams.set("start", start);
  }

  if (end) {
    embedParams.set("end", end);
  }

  if (start || end) {
    embedParams.set("loop", "1");
    embedParams.set("playlist", videoId);
  }

  return `https://www.youtube.com/embed/${videoId}?${embedParams.toString()}`;
}

export function resolveExerciseThumbnailUrl(
  exercise: Pick<ExerciseVideo, "videoUrl" | "thumbnailUrl">,
): string | null {
  const thumbnailUrl = exercise.thumbnailUrl.trim();
  return thumbnailUrl || getYouTubeThumbnailUrl(exercise.videoUrl);
}
