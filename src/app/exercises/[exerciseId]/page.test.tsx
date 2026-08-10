import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import { renderWithLanguage } from "@/test/render-with-language";

import ExerciseDetailPage from "./page";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.conditions.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog);
});

async function seedTodayState() {
  const todayKey = toDayKey(new Date());

  await saveExerciseLog({
    date: todayKey,
    exerciseId: "neck-mobility-5",
    result: "did",
  });
}

test("exercise detail page shows video, metadata, and logging actions", async () => {
  const user = userEvent.setup();

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }), {
    initialLanguage: "en",
  });

  expect(screen.getByText(/gentle seated mobility work/i)).toBeInTheDocument();
  expect(screen.getByText(/^mobility$/i)).toBeInTheDocument();
  expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /did it/i })).toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));

  expect(await screen.findByTitle("Neck Mobility")).toHaveAttribute("src", expect.stringContaining("youtube.com/embed/"));
});

test("exercise detail logging persists the selected result", async () => {
  const todayKey = toDayKey(new Date());
  const user = userEvent.setup();

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }), {
    initialLanguage: "en",
  });

  await user.click(await screen.findByRole("button", { name: /did it/i }));

  await waitFor(async () => {
    await expect(listExerciseLogsForDay(todayKey)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "neck-mobility-5",
          result: "did",
        }),
      ]),
    );
  });

  expect(screen.getByText("Saved: Did it")).toBeInTheDocument();
});

test("exercise detail hydrates an existing log state on first render", async () => {
  await seedTodayState();

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }), {
    initialLanguage: "en",
  });

  expect(await screen.findByText("Saved: Did it")).toBeInTheDocument();
});

test("keeps imported content raw on the detail screen", async () => {
  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }));

  expect(await screen.findByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Neck Mobilityの動画を再生/i })).toBeInTheDocument();
});

test("exercise detail page shows a derived thumbnail with an embeddable play button", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "blank-youtube-thumb" }) }));

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Blank Thumbnail Exerciseの動画を再生/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /動画を見る/i })).not.toBeInTheDocument();
});

test("falls back to the external watch link for a non-embeddable video URL", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "non-youtube-video",
    title: "MP4 Exercise",
    description: "",
    videoUrl: "https://example.com/video.mp4",
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "non-youtube-video" }) }));

  expect(await screen.findByRole("link", { name: /動画を見る/i })).toHaveAttribute(
    "href",
    "https://example.com/video.mp4",
  );
  expect(screen.queryByRole("button", { name: /の動画を再生/i })).not.toBeInTheDocument();
});

