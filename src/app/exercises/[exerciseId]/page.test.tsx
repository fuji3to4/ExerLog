import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { toDayKey } from "@/lib/date/day-key";
import { renderWithLanguage } from "@/test/render-with-language";

import ExerciseDetailPage, { generateStaticParams } from "./page";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.conditions.clear();
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
  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }), {
    initialLanguage: "en",
  });

  expect(screen.getByRole("link", { name: /watch video/i })).toHaveAttribute("href", expect.stringContaining("youtube"));
  expect(screen.getByText(/gentle seated mobility work/i)).toBeInTheDocument();
  expect(screen.getByText(/^mobility$/i)).toBeInTheDocument();
  expect(screen.getByText(/5 min/i)).toBeInTheDocument();
  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /did it/i })).toBeInTheDocument();
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

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();
  expect(await screen.findByText("Saved: Did it")).toBeInTheDocument();
});

test("generateStaticParams returns all catalog exercise ids", () => {
  expect(generateStaticParams()).toEqual([
    { exerciseId: "shoulder-roll-4" },
    { exerciseId: "hip-mobility-6" },
    { exerciseId: "seated-calf-raise-5" },
    { exerciseId: "neck-mobility-5" },
    { exerciseId: "breathing-reset-3" },
    { exerciseId: "walk-in-place-10" },
  ]);
});

test("keeps imported content raw on the detail screen", async () => {
  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "neck-mobility-5" }) }));

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /動画を見る/i })).toBeInTheDocument();
});
