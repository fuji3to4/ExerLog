import { describe, expect, test } from "vitest";

import { getYouTubeThumbnailUrl, getYouTubeVideoId, resolveExerciseThumbnailUrl } from "./youtube";

describe("getYouTubeVideoId", () => {
  test("reads a standard watch URL", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("reads a short youtu.be URL", () => {
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("reads an embed URL", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("returns null for a non-YouTube URL", () => {
    expect(getYouTubeVideoId("https://example.com/video.mp4")).toBeNull();
  });
});

test("builds a default thumbnail URL from a YouTube URL", () => {
  expect(getYouTubeThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("prefers a custom thumbnail over a derived YouTube thumbnail", () => {
  expect(
    resolveExerciseThumbnailUrl({
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://cdn.example.com/custom.jpg",
    }),
  ).toBe("https://cdn.example.com/custom.jpg");
});

test("derives a thumbnail when thumbnailUrl is blank and the video is from YouTube", () => {
  expect(
    resolveExerciseThumbnailUrl({
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "",
    }),
  ).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
});

test("returns null when neither a custom thumbnail nor a YouTube URL is available", () => {
  expect(
    resolveExerciseThumbnailUrl({
      videoUrl: "https://example.com/video.mp4",
      thumbnailUrl: "",
    }),
  ).toBeNull();
});
