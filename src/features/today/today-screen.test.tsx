import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { getDailyCondition, saveDailyCondition } from "@/features/storage/daily-condition.repository";
import { appDb } from "@/features/storage/app-db";
import { listExerciseLogsForDay, saveExerciseLog } from "@/features/storage/exercise-logs.repository";

import { TodayScreen } from "./components/today-screen";

beforeEach(async () => {
  await appDb.logs.clear();
  await appDb.conditions.clear();
});

async function seedCondition(date: string, conditionLevel: "good" | "okay" | "tired", note: string) {
  await saveDailyCondition({ date, conditionLevel, note });
}

async function seedLog(date: string, exerciseId: string, result: "did" | "partial" | "could_not") {
  await saveExerciseLog({ date, exerciseId, result });
}

test("saves a daily condition and logs an exercise from the home screen", async () => {
  const user = userEvent.setup();

  render(<TodayScreen date="2026-03-23" />);

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();

  await user.click(await screen.findByRole("radio", { name: /feeling good/i }));
  await user.type(screen.getByRole("textbox", { name: /note/i }), "Neck feels better today");
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyCondition("2026-03-23")).resolves.toMatchObject({
      conditionLevel: "good",
      note: "Neck feels better today",
    });
  });

  const neckMobilityCard = screen.getByRole("article", { name: "Neck Mobility" });

  await user.click(within(neckMobilityCard).getByRole("button", { name: /did it/i }));

  await waitFor(async () => {
    await expect(listExerciseLogsForDay("2026-03-23")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseId: "neck-mobility-5",
          result: "did",
        }),
      ]),
    );
  });
});

test("hydrates an existing condition note and log state on first render", async () => {
  await seedCondition("2026-03-24", "tired", "Need a lighter day");
  await seedLog("2026-03-24", "neck-mobility-5", "partial");

  render(<TodayScreen date="2026-03-24" />);

  expect(screen.getByText(/loading today's log/i)).toBeInTheDocument();
  expect(screen.queryByRole("radio", { name: /okay/i })).not.toBeInTheDocument();

  const neckMobilityCard = await screen.findByRole("article", { name: "Neck Mobility" });

  expect(screen.getByRole("radio", { name: /tired/i })).toBeChecked();
  expect(screen.getByRole("textbox", { name: /note/i })).toHaveValue("Need a lighter day");
  expect(within(neckMobilityCard).getByRole("button", { name: /partly/i })).toHaveAttribute("aria-pressed", "true");
  expect(within(neckMobilityCard).getByText("Saved: Partly")).toBeInTheDocument();
});

test("keeps recommendations short and stable for the selected day", async () => {
  const { rerender } = render(<TodayScreen date="2026-03-23" />);

  const pageHeader = screen.getByRole("heading", { name: /today/i, level: 1 });

  expect(pageHeader.compareDocumentPosition(await screen.findByRole("heading", { name: "Neck Mobility" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Breathing Reset" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Walk in Place" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Shoulder Rolls" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /watch/i })).toHaveLength(3);

  rerender(<TodayScreen date="2026-03-23" />);

  expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Breathing Reset" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Walk in Place" })).toBeInTheDocument();
});

test("edits an existing daily condition and updates recommendations", async () => {
  const user = userEvent.setup();

  await seedCondition("2026-03-24", "okay", "Start steady");

  render(<TodayScreen date="2026-03-24" />);

  await waitFor(() => {
    expect(screen.getByRole("textbox", { name: /note/i })).toHaveValue("Start steady");
  });
  expect(screen.getByRole("heading", { name: "Seated Calf Raise" })).toBeInTheDocument();

  await user.click(screen.getByRole("radio", { name: /tired/i }));
  await user.clear(screen.getByRole("textbox", { name: /note/i }));
  await user.type(screen.getByRole("textbox", { name: /note/i }), "Heavy legs");
  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyCondition("2026-03-24")).resolves.toMatchObject({
      conditionLevel: "tired",
      note: "Heavy legs",
    });
  });

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Neck Mobility" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Seated Calf Raise" })).not.toBeInTheDocument();
  });
});

test("supports keyboard reachability for today controls", async () => {
  const user = userEvent.setup();

  render(<TodayScreen date="2026-03-23" />);

  const neckMobilityCard = await screen.findByRole("article", { name: "Neck Mobility" });

  await user.tab();
  expect(screen.getByRole("radio", { name: /okay/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("textbox", { name: /note/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("button", { name: /save condition/i })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveFocus();

  await user.tab();
  expect(within(neckMobilityCard).getByRole("button", { name: /did it/i })).toHaveFocus();
});

test("shows watch and library links for the today screen", async () => {
  render(<TodayScreen date="2026-03-23" />);

  expect(await screen.findByRole("link", { name: /watch neck mobility/i })).toHaveAttribute(
    "href",
    "/exercises/neck-mobility-5",
  );
  expect(screen.getByRole("link", { name: /library/i })).toHaveAttribute("href", "/library");
});

test("resets saved log state when the selected day changes", async () => {
  await seedLog("2026-03-23", "neck-mobility-5", "did");
  await seedCondition("2026-03-24", "tired", "");

  const { rerender } = render(<TodayScreen date="2026-03-23" />);

  const firstDayCard = await screen.findByRole("article", { name: "Neck Mobility" });
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
