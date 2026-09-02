import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import { replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import { replaceDailySelfCareEntries } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { HistoryScreen } from "./components/history-screen";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog);
  await appDb.dailyWellness.clear();
  await appDb.dailyMetrics.clear();
  await appDb.dailySelfCareLogs.clear();
  await appDb.selfCareCatalog.clear();
  await appDb.selfCareCatalog.bulkAdd(selfCareCatalog);
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

async function seedLogsForHistory() {
  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "did",
  });

  await saveDailyWellness({
    date: "2026-03-23",
    physicalScore: 4,
    mentalScore: 3,
    note: "Needed a slow start",
  });

  await replaceDailyMetrics("2026-03-23", [
    { metricType: "height", value: 171, unit: "cm" },
    { metricType: "weight", value: 62, unit: "kg" },
  ]);

  await replaceDailySelfCareEntries("2026-03-23", [
    {
      selfCareId: "stretching",
      isDone: true,
      count: 1,
      minutes: 10,
      note: "Felt looser",
    },
  ]);
}

test("marks days with exercise logs in the calendar and shows the selected day summary", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });

  expect(completedDay).toBeInTheDocument();

  await user.click(completedDay);

  expect(await screen.findByText(/neck mobility/i)).toBeInTheDocument();
  expect(screen.getByText(/did it/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /wellness/i })).toBeInTheDocument();
  expect(screen.getByText("4 / 5")).toBeInTheDocument();
  expect(screen.getByText(/needed a slow start/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /metrics/i })).toBeInTheDocument();
  expect(screen.getByText("171 cm")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /self care/i })).toBeInTheDocument();
  expect(screen.getByText(/felt looser/i)).toBeInTheDocument();
});

test("uses Japanese calendar labels and summary copy by default", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />);

  const completedDay = await screen.findByRole("button", { name: /3月23日.*実施済み/i });

  expect(completedDay).toBeInTheDocument();

  await user.click(completedDay);

  expect(await screen.findByRole("heading", { name: /1日のまとめ/i })).toBeInTheDocument();
  expect(await screen.findByText("Neck Mobility")).toBeInTheDocument();
  expect(screen.getByText(/できた/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /ウェルネス/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /測定値/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /セルフケア/i })).toBeInTheDocument();
});

test("switches history copy to English while keeping exercise titles raw", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);

  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: /Day summary/i })).toBeInTheDocument();
  expect(await screen.findByText("Neck Mobility")).toBeInTheDocument();
});

test("switches to graph mode when clicking graphs button", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  // Initially in summary mode
  expect(await screen.findByRole("heading", { name: /calendar/i })).toBeInTheDocument();

  // Click the graphs button
  const graphsButton = screen.getByRole("button", { name: "Graphs" });
  await user.click(graphsButton);

  // Calendar should no longer be visible
  expect(screen.queryByRole("heading", { name: /calendar/i })).not.toBeInTheDocument();

  // Graph heading should be visible (or the metric selector label if data is empty)
  expect(await screen.findByText("Metric")).toBeInTheDocument();
});

test("returns to summary mode when clicking summary button from graph mode", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  // Switch to graph mode
  const graphsButton = screen.getByRole("button", { name: "Graphs" });
  await user.click(graphsButton);

  // Verify we're in graph mode by checking for the metric selector
  expect(await screen.findByText("Metric")).toBeInTheDocument();

  // Switch back to summary mode
  const summaryButton = screen.getByRole("button", { name: "Summary" });
  await user.click(summaryButton);

  // Calendar should be visible again
  expect(await screen.findByRole("heading", { name: /calendar/i })).toBeInTheDocument();
});

test("keeps edit and delete controls hidden in view mode after selecting a completed past day", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);

  const daySummary = await screen.findByRole("heading", { name: /day summary/i });
  const summaryCard = daySummary.closest("section");

  expect(summaryCard).not.toBeNull();
  expect(within(summaryCard!).getByText("View")).toBeInTheDocument();
  expect(within(summaryCard!).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(within(summaryCard!).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(within(summaryCard!).queryByRole("button", { name: "Delete wellness" })).not.toBeInTheDocument();
});

test("shows edit-mode controls and saves edits for a selected completed past day", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);

  await user.click(screen.getByRole("checkbox", { name: "Edit" }));

  const daySummary = await screen.findByRole("heading", { name: /day summary/i });
  const summaryCard = daySummary.closest("section");
  const wellnessHeading = screen.getByRole("heading", { name: "Wellness" });
  const wellnessSection = wellnessHeading.closest("div");

  expect(summaryCard).not.toBeNull();
  expect(wellnessSection).not.toBeNull();
  expect(within(summaryCard!).getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
  expect(within(summaryCard!).getByRole("button", { name: "Delete wellness" })).toBeInTheDocument();

  await user.click(within(wellnessSection!).getByRole("button", { name: "Edit wellness" }));
  await user.clear(screen.getByLabelText("Note"));
  await user.type(screen.getByLabelText("Note"), "Recovered after stretching");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Recovered after stretching")).toBeInTheDocument();
});
