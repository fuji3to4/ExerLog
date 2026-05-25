import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { TodayScreen } from "./components/today-screen";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.dailyWellness.clear();
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog);
});

async function seedWellness(date: string, physicalScore: 1 | 2 | 3 | 4 | 5, mentalScore: 1 | 2 | 3 | 4 | 5, note: string) {
  await saveDailyWellness({ date, physicalScore, mentalScore, note });
}

async function seedLog(date: string, exerciseId: string, result: "did" | "partial" | "could_not") {
  await saveExerciseLog({ date, exerciseId, result });
}

test("saves a daily wellness entry and logs an exercise from the home screen", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();

  const physicalInput = await screen.findByRole("spinbutton", { name: /physical/i });
  const mentalInput = screen.getByRole("spinbutton", { name: /mental/i });
  fireEvent.change(physicalInput, { target: { value: "5" } });
  fireEvent.change(mentalInput, { target: { value: "4" } });
  await user.type(screen.getByRole("textbox", { name: /note/i }), "Neck feels better today");
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyWellness("2026-03-23")).resolves.toMatchObject({
      physicalScore: 5,
      mentalScore: 4,
      note: "Neck feels better today",
    });
  });

  const seatedCalfRaiseCard = await screen.findByRole("article", { name: "Seated Calf Raise" });

  await user.click(within(seatedCalfRaiseCard).getByRole("button", { name: /did it/i }));

  await waitFor(async () => {
    await expect(listExerciseLogsForDay("2026-03-23")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "seated-calf-raise-5",
          result: "did",
        }),
      ]),
    );
  });
});

test("hydrates an existing wellness note and log state on first render", async () => {
  await seedWellness("2026-03-24", 2, 1, "Need a lighter day");
  await seedLog("2026-03-24", "neck-mobility-5", "partial");

  renderWithLanguage(<TodayScreen date="2026-03-24" />, { initialLanguage: "en" });

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: /physical/i })).not.toBeInTheDocument();

  const neckMobilityCard = await screen.findByRole("article", { name: "Neck Mobility" });

  expect(screen.getByRole("spinbutton", { name: /physical/i })).toHaveValue(2);
  expect(screen.getByRole("spinbutton", { name: /mental/i })).toHaveValue(1);
  expect(screen.getByRole("textbox", { name: /note/i })).toHaveValue("Need a lighter day");
  expect(within(neckMobilityCard).getByRole("button", { name: /partly/i })).toHaveAttribute("aria-pressed", "true");
  expect(within(neckMobilityCard).getByText("Saved: Partly")).toBeInTheDocument();
});

test("keeps recommendations short and stable for the selected day", async () => {
  const { rerender } = renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  const pageHeader = screen.getByRole("heading", { name: /today/i, level: 1 });

  expect(pageHeader.compareDocumentPosition(await screen.findByRole("heading", { name: "Seated Calf Raise" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Shoulder Rolls" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Walk in Place" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Neck Mobility" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /watch/i })).toHaveLength(3);

  rerender(<TodayScreen date="2026-03-23" />);

  expect(screen.getByRole("heading", { name: "Seated Calf Raise" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Shoulder Rolls" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Walk in Place" })).toBeInTheDocument();
});

test("edits an existing daily wellness entry and updates recommendations", async () => {
  const user = userEvent.setup();

  await seedWellness("2026-03-24", 3, 3, "Start steady");

  renderWithLanguage(<TodayScreen date="2026-03-24" />, { initialLanguage: "en" });

  await waitFor(() => {
    expect(screen.getByRole("textbox", { name: /note/i })).toHaveValue("Start steady");
  });
  expect(await screen.findByRole("heading", { name: "Breathing Reset" })).toBeInTheDocument();

  const physicalInput = screen.getByRole("spinbutton", { name: /physical/i });
  const mentalInput = screen.getByRole("spinbutton", { name: /mental/i });
  fireEvent.change(physicalInput, { target: { value: "1" } });
  fireEvent.change(mentalInput, { target: { value: "2" } });
  await user.clear(screen.getByRole("textbox", { name: /note/i }));
  await user.type(screen.getByRole("textbox", { name: /note/i }), "Heavy legs");
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyWellness("2026-03-24")).resolves.toMatchObject({
      physicalScore: 1,
      mentalScore: 2,
      note: "Heavy legs",
    });
  });

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Breathing Reset" })).not.toBeInTheDocument();
  });
});

test("supports keyboard reachability for today controls", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  const seatedCalfRaiseCard = await screen.findByRole("article", { name: "Seated Calf Raise" });

  await user.tab();
  expect(screen.getByRole("spinbutton", { name: /physical/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("spinbutton", { name: /mental/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("textbox", { name: /note/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("button", { name: /save condition/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("link", { name: /watch seated calf raise/i })).toHaveFocus();

  await user.tab();
  expect(within(seatedCalfRaiseCard).getByRole("button", { name: /did it/i })).toHaveFocus();
});

test("shows watch and library links for the today screen", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch seated calf raise/i })).toHaveAttribute(
    "href",
    "/exercises?exerciseId=seated-calf-raise-5",
  );
  expect(screen.getByRole("link", { name: /library/i })).toHaveAttribute("href", "/library");
});

test("resets saved log state when the selected day changes", async () => {
  await seedLog("2026-03-23", "seated-calf-raise-5", "did");
  await seedWellness("2026-03-24", 1, 2, "");

  const { rerender } = renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  const firstDayCard = await screen.findByRole("article", { name: "Seated Calf Raise" });
  await waitFor(() => {
    expect(within(firstDayCard).getByRole("button", { name: /did it/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  rerender(<TodayScreen date="2026-03-24" />);

  const secondDayCard = await screen.findByRole("article", { name: "Neck Mobility" });
  await waitFor(() => {
    expect(within(secondDayCard).getByRole("button", { name: /did it/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

test("shows Japanese fixed UI by default while leaving exercise titles unchanged", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />);

  await waitFor(() => {
    expect(screen.queryByText(/今日のログを読み込み中/i)).not.toBeInTheDocument();
  });

  expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /体調を保存/i })).toBeInTheDocument();
  expect(await screen.findByRole("article", { name: "Seated Calf Raise" })).toBeInTheDocument();
  
  const watchLink = screen.getAllByRole("link").find(link => 
    link.getAttribute("aria-label")?.includes("Seated Calf Raise") && link.getAttribute("aria-label")?.includes("を見る")
  );
  expect(watchLink).toBeInTheDocument();
});

test("switches Today fixed UI to English without translating exercise content", async () => {
  renderWithLanguage(<TodayScreen date="2026-03-23" />, { initialLanguage: "en" });

  await waitFor(() => {
    expect(screen.queryByText(/loading today's log/i)).not.toBeInTheDocument();
  });

  expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save condition/i })).toBeInTheDocument();
  expect(await screen.findByRole("article", { name: "Seated Calf Raise" })).toBeInTheDocument();
});
