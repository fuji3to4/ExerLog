import type { ReactElement } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

import { exerciseCatalog } from "@/features/catalog/exercise-catalog.default";
import { appDb } from "@/features/storage/app-db";
import { addExerciseLog, listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import { MockSyncProvider } from "@/test/mock-sync-provider";
import { renderWithLanguage } from "@/test/render-with-language";

import ExercisesPage from "./page";

/** Open the detail page the way the app links to it: /exercises?exerciseId=<id>. */
async function exercisePage(exerciseId: string) {
  window.history.pushState({}, "", `/exercises?exerciseId=${encodeURIComponent(exerciseId)}`);
  return ExercisesPage();
}

function renderPage(ui: ReactElement, options?: Parameters<typeof renderWithLanguage>[1]) {
  return renderWithLanguage(<MockSyncProvider>{ui}</MockSyncProvider>, options);
}

beforeEach(async () => {
  await appDb.exerciseLogs.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
});

async function seedTodayState() {
  const todayKey = toDayKey(new Date());

  await addExerciseLog({
    durationSeconds: 300,
    date: todayKey,
    exerciseId: "neck-mobility-5",
    result: "did",
  });
}

test("exercise detail page shows video, metadata, and logging actions", async () => {
  const user = userEvent.setup();

  renderPage(await exercisePage("neck-mobility-5"), {
    initialLanguage: "en",
  });

  expect(await screen.findByText(/gentle seated mobility work/i)).toBeInTheDocument();
  expect(screen.getByText(/^5:00 · .*Mobility/)).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /did it/i })).toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));

  expect(await screen.findByTitle("Neck Mobility")).toHaveAttribute("src", expect.stringContaining("youtube.com/embed/"));
});

test("exercise detail logging persists the selected result", async () => {
  const todayKey = toDayKey(new Date());
  const user = userEvent.setup();

  renderPage(await exercisePage("neck-mobility-5"), {
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

  expect(await screen.findByText("1 today / 1 total")).toBeInTheDocument();
});

test("exercise detail hydrates an existing log state on first render", async () => {
  await seedTodayState();

  renderPage(await exercisePage("neck-mobility-5"), {
    initialLanguage: "en",
  });

  expect(await screen.findByText("1 today / 1 total")).toBeInTheDocument();
});

test("keeps imported content raw on the detail screen", async () => {
  renderPage(await exercisePage("neck-mobility-5"));

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
    durationSeconds: 300,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  });

  renderPage(await exercisePage("blank-youtube-thumb"));

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
    durationSeconds: 300,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  });

  renderPage(await exercisePage("non-youtube-video"));

  expect(await screen.findByRole("link", { name: /動画を見る/i })).toHaveAttribute(
    "href",
    "https://example.com/video.mp4",
  );
  expect(screen.queryByRole("button", { name: /の動画を再生/i })).not.toBeInTheDocument();
});

test("query-based exercise page renders a user-created exercise id", async () => {
  await appDb.exercises.add({
    id: "be113122-1120-4320-af2b-129bc738f2dc",
    title: "UUID Exercise",
    description: "Created after install",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationSeconds: 420,
    intensity: "low",
    updatedAt: "2026-10-20T00:00:00+09:00",
  });

  window.history.pushState({}, "", "/exercises?exerciseId=be113122-1120-4320-af2b-129bc738f2dc");

  renderPage(await ExercisesPage(), { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "UUID Exercise" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /play uuid exercise/i })).toBeInTheDocument();
});
