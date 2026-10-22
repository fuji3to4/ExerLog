import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { selfCareCatalog } from "@/features/catalog/self-care-catalog";
import { replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import { replaceDailySelfCareEntries } from "@/features/storage/daily-self-care.repository";
import { appDb } from "@/features/storage/app-db";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { recordWatchEvent } from "@/features/storage/watch-events.repository";
import { addWellnessEntry } from "@/features/storage/wellness-entries.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { HistoryScreen } from "./components/history-screen";

beforeEach(async () => {
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.exercises.clear(),
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.selfCareCatalog.clear(),
  ]);
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
  await appDb.selfCareCatalog.bulkAdd(selfCareCatalog);
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

async function seedHistory() {
  // 3/23: exercise + metrics + self care
  await addExerciseLog({
    date: "2026-03-23",
    exerciseId: "upper-body-shoulder-rolls",
    result: "did",
    durationSeconds: 300,
    performedAt: "2026-03-23T09:00:00+09:00",
  });
  await replaceDailyMetrics("2026-03-23", [
    { metricType: "height", value: 171, unit: "cm" },
    { metricType: "weight", value: 62, unit: "kg" },
  ]);
  await replaceDailySelfCareEntries("2026-03-23", [
    { selfCareId: "stretching", isDone: true, count: 1, minutes: 10, note: "Felt looser" },
  ]);

  // 3/24: wellness only
  await addWellnessEntry({
    date: "2026-03-24",
    recordedAt: "2026-03-24T08:00:00+09:00",
    physicalScore: 4,
    mentalScore: 3,
    note: "",
  });

  // 3/25: watched only
  await recordWatchEvent({
    exerciseId: "upper-body-shoulder-rolls",
    date: "2026-03-25",
    watchedAt: "2026-03-25T10:00:00+09:00",
  });
}

test("shows a hanamaru on exercise days and a dot on record-only days", async () => {
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const exerciseDay = await screen.findByRole("button", { name: "March 23, completed" });
  expect(exerciseDay.className).toContain("is-completed");
  expect(within(exerciseDay).getByText("💮")).toBeInTheDocument();
  expect(exerciseDay.querySelector(".history-calendar__hanamaru")).not.toBeNull();
  expect(exerciseDay.querySelector(".history-calendar__dot")).toBeNull();

  const wellnessDay = screen.getByRole("button", { name: "March 24 (recorded)" });
  expect(wellnessDay.querySelector(".history-calendar__dot")).not.toBeNull();
  expect(within(wellnessDay).queryByText("💮")).toBeNull();
  expect(wellnessDay.className).not.toContain("is-completed");

  const watchDay = screen.getByRole("button", { name: "March 25 (recorded)" });
  expect(watchDay.querySelector(".history-calendar__dot")).not.toBeNull();

  const emptyDay = screen.getByRole("button", { name: "March 26" });
  expect(emptyDay.querySelector(".history-calendar__dot")).toBeNull();
  expect(within(emptyDay).queryByText("💮")).toBeNull();
});

test("uses Japanese calendar labels by default", async () => {
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />);

  expect(await screen.findByRole("button", { name: /3月23日.*実施済み/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "3月24日（記録あり）" })).toBeInTheDocument();
});

test("shows the selected day's timeline above the metrics and self care summary", async () => {
  const user = userEvent.setup();
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "March 23, completed" }));

  const exerciseRow = await screen.findByRole("button", { name: /肩回し/ });
  expect(await screen.findByRole("heading", { name: /metrics/i })).toBeInTheDocument();
  expect(screen.getByText("171 cm")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /self care/i })).toBeInTheDocument();
  expect(screen.getByText(/felt looser/i)).toBeInTheDocument();

  const summaryHeading = screen.getByRole("heading", { name: /day summary/i });
  // The timeline comes before the day summary in document order.
  expect(exerciseRow.compareDocumentPosition(summaryHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "March 24 (recorded)" }));
  expect(await screen.findByRole("button", { name: /body 4/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /肩回し/ })).toBeNull();
});

test("adds a wellness entry to a past day's timeline and refreshes the calendar marks", async () => {
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  fireEvent.click(await screen.findByRole("button", { name: "3月10日" }));

  fireEvent.click(await screen.findByRole("button", { name: "＋ 記録する" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(within(dialog).getByRole("group", { name: "からだ" })).getByRole("button", { name: "4" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });

  expect(await screen.findByRole("button", { name: /からだ4/ })).toBeInTheDocument();
  const entries = await appDb.wellnessEntries.where("date").equals("2026-03-10").toArray();
  expect(entries).toHaveLength(1);

  const markedDay = await screen.findByRole("button", { name: "3月10日（記録あり）" });
  expect(markedDay.querySelector(".history-calendar__dot")).not.toBeNull();
});

test("switches history copy to English", async () => {
  const user = userEvent.setup();
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "March 23, completed" }));

  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: /Day summary/i })).toBeInTheDocument();
});

test("switches to graph mode when clicking graphs button", async () => {
  const user = userEvent.setup();

  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  expect(await screen.findByRole("heading", { name: /calendar/i })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Graphs" }));

  expect(screen.queryByRole("heading", { name: /calendar/i })).not.toBeInTheDocument();
  expect(await screen.findByText("Metric")).toBeInTheDocument();
});

test("returns to summary mode when clicking summary button from graph mode", async () => {
  const user = userEvent.setup();

  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  await user.click(screen.getByRole("button", { name: "Graphs" }));
  expect(await screen.findByText("Metric")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Summary" }));

  expect(await screen.findByRole("heading", { name: /calendar/i })).toBeInTheDocument();
});

test("keeps metric edit controls hidden in view mode and shows them in edit mode", async () => {
  const user = userEvent.setup();

  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "March 23, completed" }));

  const daySummary = await screen.findByRole("heading", { name: /day summary/i });
  const summaryCard = daySummary.closest(".day-summary") as HTMLElement | null;

  expect(summaryCard).not.toBeNull();
  expect(within(summaryCard!).getByText("View")).toBeInTheDocument();
  expect(within(summaryCard!).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(within(summaryCard!).queryByRole("button", { name: "Delete weight" })).not.toBeInTheDocument();

  await user.click(within(summaryCard!).getByRole("switch", { name: "Edit" }));

  expect(within(summaryCard!).getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
  expect(within(summaryCard!).getByRole("button", { name: "Delete weight" })).toBeInTheDocument();
  expect(within(summaryCard!).getByRole("button", { name: "Add body fat" })).toBeInTheDocument();
});

test("labels the mode toggle and graph controls in Japanese", async () => {
  const user = userEvent.setup();

  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  expect(screen.getByRole("button", { name: "まとめ" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "グラフ" }));

  expect(await screen.findByText("表示する項目")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "7日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "全期間" })).toBeInTheDocument();
  expect(screen.queryByText("Summary")).not.toBeInTheDocument();
});
