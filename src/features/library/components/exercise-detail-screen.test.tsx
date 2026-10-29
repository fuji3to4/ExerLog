import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { CelebrationProvider } from "@/features/feedback/celebration";

import { appDb } from "@/features/storage/app-db";
import { listExerciseSets } from "@/features/storage/exercise-sets.repository";
import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { ExerciseDetailScreen } from "./exercise-detail-screen";

beforeEach(async () => {
  await Promise.all([appDb.exerciseLogs.clear(), appDb.watchEvents.clear(), appDb.tombstones.clear(), appDb.exerciseSets.clear()]);
});

const youtubeExercise: ExerciseVideo = {
  id: "neck-mobility-5",
  title: "Neck Mobility",
  description: "Gentle seated mobility work for the neck and shoulders.",
  videoUrl: "https://www.youtube.com/watch?v=equcr3cpxNQ&start=4&end=45",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 300,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

const nonEmbeddableExercise: ExerciseVideo = {
  id: "mp4-exercise",
  title: "MP4 Exercise",
  description: "",
  videoUrl: "https://example.com/video.mp4",
  thumbnailUrl: "https://cdn.example.com/thumb.jpg",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 300,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

test("shows a play button over the thumbnail instead of the external watch link", async () => {
  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  expect(await screen.findByRole("button", { name: /play neck mobility/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /watch video/i })).not.toBeInTheDocument();
});

test("clicking the play button swaps the thumbnail for an autoplaying, looping embed", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));

  const iframe = await screen.findByTitle("Neck Mobility");
  expect(iframe).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/equcr3cpxNQ?autoplay=1&start=4&end=45&loop=1&playlist=equcr3cpxNQ",
  );
  expect(screen.queryByRole("button", { name: /play neck mobility/i })).not.toBeInTheDocument();
});

test("falls back to the external watch link when the video isn't embeddable", async () => {
  renderWithLanguage(<ExerciseDetailScreen exercise={nonEmbeddableExercise} />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch video/i })).toHaveAttribute(
    "href",
    "https://example.com/video.mp4",
  );
  expect(screen.queryByRole("button", { name: /play/i })).not.toBeInTheDocument();
});

test("pressing play records a watch event", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));
  expect(await appDb.watchEvents.count()).toBe(1);
  expect((await appDb.watchEvents.toArray())[0].exerciseId).toBe("neck-mobility-5");
});

test("repeated plays are deduped to a single watch event", async () => {
  const { recordWatchEvent } = await import("@/features/storage/watch-events.repository");
  await recordWatchEvent({ exerciseId: "neck-mobility-5" });
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={youtubeExercise} />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: /play neck mobility/i }));
  expect(await appDb.watchEvents.count()).toBe(1);
});

test("the external watch link records a watch event", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={nonEmbeddableExercise} />, { initialLanguage: "en" });

  const link = await screen.findByRole("link", { name: /watch video/i });
  link.addEventListener("click", (event) => event.preventDefault());
  await user.click(link);

  expect(await appDb.watchEvents.count()).toBe(1);
});

test("pressing did logs the exercise with its duration, celebrates, and can repeat", async () => {
  const user = userEvent.setup();

  renderWithLanguage(
    <CelebrationProvider>
      <ExerciseDetailScreen exercise={youtubeExercise} />
    </CelebrationProvider>,
    { initialLanguage: "en" },
  );

  await user.click(await screen.findByRole("button", { name: "Did it" }));

  expect(await screen.findByText(/Nice work! 5 min done/)).toBeInTheDocument();
  const logs = await appDb.exerciseLogs.toArray();
  expect(logs).toHaveLength(1);
  expect(logs[0].durationSeconds).toBe(300);
  expect(logs[0].result).toBe("did");

  await user.click(screen.getByRole("button", { name: "Did it" }));
  await waitFor(async () => expect(await appDb.exerciseLogs.count()).toBe(2));
});

const strengthExercise: ExerciseVideo = {
  id: "squat-1",
  title: "Squat Basics",
  description: "Slow squats for the legs.",
  videoUrl: "https://www.youtube.com/watch?v=equcr3cpxNQ",
  thumbnailUrl: "",
  bodyArea: "lower-body",
  purpose: "strength",
  durationSeconds: 60,
  intensity: "high",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

test("shows title and a single meta line instead of boxes", async () => {
  renderWithLanguage(<ExerciseDetailScreen exercise={strengthExercise} />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Squat Basics" })).toBeInTheDocument();
  expect(screen.getByText("1:00 · High intensity · Lower body · Strength")).toBeInTheDocument();
  expect(screen.queryByText("Purpose")).not.toBeInTheDocument();
});

test("adds the video to a new set from the + Set button", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseDetailScreen exercise={strengthExercise} />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "Add Squat Basics to a set" }));
  await user.click(await screen.findByRole("menuitem", { name: "+ New set" }));

  const dialog = await screen.findByRole("dialog");
  await user.type(within(dialog).getByLabelText("Set name"), "Morning");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const sets = await listExerciseSets();
    expect(sets).toEqual([expect.objectContaining({ name: "Morning", exerciseIds: ["squat-1"] })]);
  });
});

test("logging still works and the description box shows today's status", async () => {
  const user = userEvent.setup();

  renderWithLanguage(
    <CelebrationProvider>
      <ExerciseDetailScreen exercise={strengthExercise} />
    </CelebrationProvider>,
    { initialLanguage: "en" },
  );

  const box = (await screen.findByText("Slow squats for the legs.")).closest(".exercise-detail__description") as HTMLElement;
  expect(within(box).getByText("Not logged yet")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Did it" }));

  expect(await within(box).findByText("1 times today")).toBeInTheDocument();
});
