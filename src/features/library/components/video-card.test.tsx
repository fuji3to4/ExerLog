import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { VideoCard } from "./video-card";

const exercise: ExerciseVideo = {
  id: "neck-mobility-5",
  title: "Neck Mobility",
  description: "Gentle neck circles to loosen up.",
  videoUrl: "https://example.com/neck.mp4",
  thumbnailUrl: "https://example.com/neck.jpg",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 60,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

const href = "/exercises?exerciseId=neck-mobility-5";

test("links thumbnail and title to the video with a single accessible watch link", () => {
  renderWithLanguage(<VideoCard exercise={exercise} href={href} headingLevel={2} meta={["High"]} />, {
    initialLanguage: "en",
  });

  const links = screen.getAllByRole("link", { name: "Watch Neck Mobility" });
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAttribute("href", href);
});

test("shows the duration badge and a single meta line", () => {
  renderWithLanguage(
    <VideoCard exercise={exercise} href={href} headingLevel={2} meta={["High", "Lower body", "", "Strength"]} />,
    { initialLanguage: "en" },
  );

  expect(screen.getByText("High · Lower body · Strength")).toBeInTheDocument();
  const thumbnail = document.querySelector(".video-card__thumbnail") as HTMLElement;
  expect(within(thumbnail).getByText("1:00")).toBeInTheDocument();
});

test("clamps long titles and descriptions", () => {
  renderWithLanguage(<VideoCard exercise={exercise} href={href} headingLevel={2} meta={[]} />, {
    initialLanguage: "en",
  });

  expect(screen.getByRole("link", { name: "Watch Neck Mobility" })).toHaveClass("line-clamp-2");
  expect(screen.getByText("Gentle neck circles to loosen up.")).toHaveClass("line-clamp-2");
});

test("renders without a thumbnail", () => {
  renderWithLanguage(
    <VideoCard
      exercise={{ ...exercise, thumbnailUrl: "", videoUrl: "" }}
      href={href}
      headingLevel={3}
      meta={["High", "Strength"]}
    />,
    { initialLanguage: "en" },
  );

  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByRole("link", { name: "Watch Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  expect(screen.getByText("1:00 · High · Strength")).toBeInTheDocument();
});

test("renders eyebrow, menu and footer slots", () => {
  renderWithLanguage(
    <VideoCard
      exercise={exercise}
      href={href}
      headingLevel={2}
      meta={[]}
      eyebrow="New"
      menu={<button type="button">m</button>}
    >
      <button type="button">f</button>
    </VideoCard>,
    { initialLanguage: "en" },
  );

  expect(screen.getByText("New")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "m" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "f" })).toBeInTheDocument();
});
