import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { bodyRepository } from "@/features/modules/body/data";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { recordWatchEvent } from "@/features/storage/watch-events.repository";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { renderWithLanguage } from "@/test/render-with-language";

import { HistoryScreen } from "./components/history-screen";

beforeEach(async () => {
  window.localStorage.removeItem("lymly-record-modules");
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.watchEvents.clear(),
    appDb.exercises.clear(),
    appDb.bodyRecords.clear(),
    appDb.circumferenceRecords.clear(),
  ]);
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

async function seedHistory() {
  // 3/23: exercise + measurement
  await addExerciseLog({
    date: "2026-03-23",
    exerciseId: "shoulder-roll-4",
    result: "did",
    durationSeconds: 300,
    performedAt: "2026-03-23T09:00:00+09:00",
  });
  await bodyRepository.add({
    date: "2026-03-23",
    recordedAt: "2026-03-23T07:00:00+09:00",
    values: { height: 171, weight: 62 },
    note: "",
  });

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
    exerciseId: "shoulder-roll-4",
    date: "2026-03-25",
    watchedAt: "2026-03-25T10:00:00+09:00",
  });

  // 3/27: body measurement only
  await bodyRepository.add({
    date: "2026-03-27",
    recordedAt: "2026-03-27T07:30:00+09:00",
    values: { weight: 61.5 },
    note: "",
  });

  // 3/28: circumference only
  await circumferenceRepository.add({
    date: "2026-03-28",
    recordedAt: "2026-03-28T07:30:00+09:00",
    values: { armWristLeft: 15 },
    note: "",
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

  const measurementDay = screen.getByRole("button", { name: "March 27 (recorded)" });
  expect(measurementDay.querySelector(".history-calendar__dot")).not.toBeNull();
  expect(within(measurementDay).queryByText("💮")).toBeNull();

  const circumferenceDay = screen.getByRole("button", { name: "March 28 (recorded)" });
  expect(circumferenceDay.querySelector(".history-calendar__dot")).not.toBeNull();

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

test("shows the selected day's timeline without a day summary card", async () => {
  const user = userEvent.setup();
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  await user.click(await screen.findByRole("button", { name: "March 23, completed" }));

  expect(await screen.findByRole("button", { name: /Shoulder Rolls/ })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /day summary/i })).toBeNull();
  expect(screen.queryByRole("heading", { name: /metrics/i })).toBeNull();

  await user.click(screen.getByRole("button", { name: "March 24 (recorded)" }));
  expect(await screen.findByRole("button", { name: /body 4/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Shoulder Rolls/ })).toBeNull();
});

test("adds a wellness entry to a past day's timeline and refreshes the calendar marks", async () => {
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  fireEvent.click(await screen.findByRole("button", { name: "3月10日" }));

  fireEvent.keyDown(await screen.findByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: "体調" }));
  const dialog = await screen.findByRole("dialog", { name: "体調を記録" });
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
  expect(await screen.findByRole("heading", { name: "Calendar" })).toBeInTheDocument();
});

test("has no summary/graph toggle and starts on the すべて chip", async () => {
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  expect(await screen.findByRole("heading", { name: "カレンダー" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "まとめ" })).toBeNull();
  expect(screen.queryByRole("button", { name: "グラフ" })).toBeNull();
  const chips = within(screen.getByRole("tablist", { name: "表示する記録" })).getAllByRole("tab");
  expect(chips.map((chip) => chip.textContent)).toEqual(["すべて", "体調", "身体", "周径"]);
  expect(screen.getByRole("tab", { name: "すべて" })).toHaveAttribute("aria-selected", "true");
});

test("pressing a module chip shows its graph controls instead of the calendar", async () => {
  const user = userEvent.setup();
  await seedHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  await user.click(await screen.findByRole("tab", { name: "身体" }));

  expect(screen.queryByRole("heading", { name: "カレンダー" })).toBeNull();
  expect(await screen.findByText("表示する項目")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "7日" })).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "すべて" }));
  expect(await screen.findByRole("heading", { name: "カレンダー" })).toBeInTheDocument();
});

test("a module turned OFF has no chip and its records no longer mark the calendar", async () => {
  await seedHistory();
  window.localStorage.setItem("lymly-record-modules", JSON.stringify({ order: ["wellness", "body", "circumference"], disabled: ["body"] }));

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  await screen.findByRole("button", { name: "3月24日（記録あり）" });
  expect(screen.queryByRole("tab", { name: "身体" })).toBeNull();
  // 3/27 had only a body measurement.
  expect(screen.getByRole("button", { name: "3月27日" })).toBeInTheDocument();
});

test("opens the period summary dialog from the all view", async () => {
  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "ja" });

  await userEvent.click(await screen.findByRole("button", { name: "期間でまとめる" }));

  expect(await screen.findByRole("dialog", { name: "期間のまとめ" })).toBeInTheDocument();
});
