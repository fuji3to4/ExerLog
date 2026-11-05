/** The small slice of the YouTube IFrame Player API the playlist uses (declared here, no @types/youtube). */
export type YTPlayer = {
  loadVideoById(args: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  destroy(): void;
};

export type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onStateChange?: (event: { data: number }) => void;
        /** 2 invalid id, 5 HTML5 error, 100 removed/private, 101/150 embedding disabled. */
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number };
};

type YouTubeWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

let pending: Promise<YTNamespace> | null = null;

/** Loads the IFrame API script once per page and resolves with the global `YT`. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (pending) {
    return pending;
  }

  const win = window as YouTubeWindow;

  pending = new Promise<YTNamespace>((resolve, reject) => {
    if (win.YT?.Player) {
      resolve(win.YT);
      return;
    }

    const previousReady = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (win.YT) {
        resolve(win.YT);
      }
    };

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = () => {
        // Let a later call try again (e.g. after coming back online).
        pending = null;
        reject(new Error("Failed to load the YouTube IFrame API"));
      };
      document.head.appendChild(script);
    }
  });

  return pending;
}
