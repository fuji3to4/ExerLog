import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { addWellnessEntry } from "@/features/storage/wellness-entries.repository";
import type { ExerciseDraft } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { TodayScreen } from "./components/today-screen";

function exercise(id: string, title: string, intensity: ExerciseDraft["intensity"]): ExerciseDraft {
  return {
    id,
    title,
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    bodyArea: "full-body",
    purpose: "mobility",
    durationSeconds: 300,
    intensity,
  };
}

// The catalog is read back in id order (alpha, beta, delta, epsilon, gamma, zeta).
// On 2026-10-20 (offset 10*20=200): "okay" shows Delta, Epsilon, Gamma;
// "tired" drops high-intensity items and shows Zeta, Delta, Epsilon.
// On 2026-10-21 (offset 210): "okay" shows Alpha, Beta, Delta.
const catalog = [
  exercise("alpha", "Alpha", "high"),
  exercise("beta", "Beta", "high"),
  exercise("gamma", "Gamma", "high"),
  exercise("delta", "Delta", "low"),
  exercise("epsilon", "Epsilon", "low"),
  exercise("zeta", "Zeta", "low"),
];

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 20, 20, 0, 0));
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.tombstones.clear(),
    appDb.exercises.clear(),
  ]);
  await replaceAllExercises(catalog);
});

afterEach(() => {
  vi.useRealTimers();
});

async function seedLog(date: string, exerciseId: string) {
  await addExerciseLog({ date, exerciseId, result: "did", durationSeconds: 300 });
}

test("places the timeline under the header and above the recommendations", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();

  const header = screen.getByRole("heading", { name: "Today", level: 1 });
  const addButton = screen.getByRole("button", { name: "+ Log condition" });
  const recommended = await screen.findByRole("region", { name: /recommended/i });

  expect(header.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(addButton.compareDocumentPosition(recommended) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("region", { name: /daily condition/i })).toBeNull();
});

test("recommends for an okay condition when nothing is recorded", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Gamma" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Delta" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Epsilon" })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /^watch /i })).toHaveLength(3);
});

test("uses the latest wellness entry of the day for recommendations", async () => {
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T07:00:00+09:00", physicalScore: 5, mentalScore: 5, note: "" });
  await addWellnessEntry({ date: "2026-10-20", recordedAt: "2026-10-20T19:00:00+09:00", physicalScore: 1, mentalScore: 2, note: "" });

  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: "Zeta" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Gamma" })).toBeNull();
});

test("shows watch and library links for the today screen", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  expect(await screen.findByRole("region", { name: /need something else/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /watch delta/i })).toHaveAttribute("href", "/exercises?exerciseId=delta");
  expect(within(screen.getByRole("region", { name: /need something else/i })).getByRole("link", { name: /library/i })).toHaveAttribute(
    "href",
    "/library",
  );
});

test("hydrates today's log counts and resets them when the selected day changes", async () => {
  await seedLog("2026-10-20", "delta");
  await seedLog("2026-10-20", "delta");

  const { rerender } = renderWithLanguage(<TodayScreen date="2026-10-20" />, { initialLanguage: "en" });

  const firstDayCard = await screen.findByRole("article", { name: "Delta" });
  await waitFor(() => expect(within(firstDayCard).getByText("2 times today")).toBeInTheDocument());

  rerender(<TodayScreen date="2026-10-21" />);

  const secondDayCard = await screen.findByRole("article", { name: "Delta" });
  await waitFor(() => expect(within(secondDayCard).getByText("Not logged yet")).toBeInTheDocument());
});

test("shows Japanese fixed UI by default while leaving exercise titles unchanged", async () => {
  renderWithLanguage(<TodayScreen date="2026-10-20" />);

  expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "＋ 体調を記録" })).toBeInTheDocument();
  const card = await screen.findByRole("article", { name: "Delta" });
  expect(within(card).getByRole("link", { name: /Delta.*を見る/ })).toBeInTheDocument();
  expect(within(card).getByText("未記録")).toBeInTheDocument();
});
