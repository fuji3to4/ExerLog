import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { saveDailyCondition } from "@/features/storage/daily-condition.repository";
import { appDb } from "@/features/storage/app-db";
import { saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { HistoryScreen } from "./components/history-screen";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.conditions.clear();
});

async function seedLogsForHistory() {
  await saveDailyCondition({
    date: "2026-03-23",
    conditionLevel: "tired",
    note: "Legs feel heavy",
  });

  await saveExerciseLog({
    date: "2026-03-23",
    exerciseId: "neck-mobility-5",
    result: "did",
  });
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
  expect(screen.getByText(/tired/i)).toBeInTheDocument();
  expect(screen.getByText(/legs feel heavy/i)).toBeInTheDocument();
});

test("uses Japanese calendar labels and summary copy by default", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />);

  const completedDay = await screen.findByRole("button", { name: /3月23日.*実施済み/i });

  expect(completedDay).toBeInTheDocument();

  await user.click(completedDay);

  expect(await screen.findByRole("heading", { name: /1日のまとめ/i })).toBeInTheDocument();
  expect(screen.getByText("Neck Mobility")).toBeInTheDocument();
  expect(screen.getByText(/できた/i)).toBeInTheDocument();
  expect(screen.getByText(/疲れている/i)).toBeInTheDocument();
});

test("switches history copy to English while keeping exercise titles raw", async () => {
  const user = userEvent.setup();

  await seedLogsForHistory();

  renderWithLanguage(<HistoryScreen month="2026-03" />, { initialLanguage: "en" });

  const completedDay = await screen.findByRole("button", { name: /march 23, completed/i });
  await user.click(completedDay);

  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: /Day summary/i })).toBeInTheDocument();
  expect(screen.getByText("Neck Mobility")).toBeInTheDocument();
});
