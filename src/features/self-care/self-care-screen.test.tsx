import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { LanguageContext } from "@/features/i18n/language-provider";
import type { Messages } from "@/features/i18n/messages";
import { renderWithLanguage } from "@/test/render-with-language";
import { appDb } from "@/features/storage/app-db";
import { listDailyMetricsByDate, replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import {
  listDailySelfCareEntriesByDate,
  replaceDailySelfCareEntries,
} from "@/features/storage/daily-self-care.repository";
import { getDailyWellness, saveDailyWellness } from "@/features/storage/daily-wellness.repository";

import { SelfCareScreen } from "./components/self-care-screen";

beforeEach(async () => {
  await Promise.all([
    appDb.dailyWellness.clear(),
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.selfCareCatalog.clear(),
  ]);
});

test("saves wellness, metrics, and self-care rows from the self-care screen", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });

  fireEvent.change(await screen.findByRole("spinbutton", { name: /physical score/i }), { target: { value: "4" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /mental score/i }), { target: { value: "3" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /height/i }), { target: { value: "171" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /weight/i }), { target: { value: "62" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /body fat/i }), { target: { value: "18" } });

  const stretchingRow = screen.getByRole("heading", { name: "ストレッチ", level: 3 }).closest("article");
  expect(stretchingRow).not.toBeNull();

  await user.click(within(stretchingRow!).getByRole("checkbox", { name: /done/i }));
  fireEvent.change(within(stretchingRow!).getByRole("spinbutton", { name: /count/i }), { target: { value: "1" } });
  fireEvent.change(within(stretchingRow!).getByRole("spinbutton", { name: /minutes/i }), { target: { value: "10" } });
  fireEvent.change(within(stretchingRow!).getByRole("textbox", { name: /note/i }), {
    target: { value: "Felt looser" },
  });

  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyWellness("2026-03-23")).resolves.toMatchObject({
      physicalScore: 4,
      mentalScore: 3,
    });
  });

  await waitFor(async () => {
    await expect(listDailyMetricsByDate("2026-03-23")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricType: "height", value: 171, unit: "cm" }),
        expect.objectContaining({ metricType: "weight", value: 62, unit: "kg" }),
        expect.objectContaining({ metricType: "bodyFat", value: 18, unit: "%" }),
      ]),
    );
  });

  await waitFor(async () => {
    await expect(listDailySelfCareEntriesByDate("2026-03-23")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selfCareId: "stretching",
          isDone: true,
          count: 1,
          minutes: 10,
          note: "Felt looser",
        }),
      ]),
    );
  });
});

test("hydrates saved rows on first render", async () => {
  await saveDailyWellness({
    date: "2026-03-24",
    physicalScore: 5,
    mentalScore: 2,
  });
  await replaceDailyMetrics("2026-03-24", [
    { metricType: "height", value: 172, unit: "cm" },
    { metricType: "weight", value: 63, unit: "kg" },
    { metricType: "bodyFat", value: 19, unit: "%" },
  ]);
  await replaceDailySelfCareEntries("2026-03-24", [
    {
      selfCareId: "walking",
      isDone: true,
      count: 1,
      minutes: 20,
      note: "Evening walk",
    },
  ]);

  renderWithLanguage(<SelfCareScreen date="2026-03-24" />, { initialLanguage: "en" });

  expect(await screen.findByRole("spinbutton", { name: /physical score/i })).toHaveValue(5);
  expect(screen.getByRole("spinbutton", { name: /mental score/i })).toHaveValue(2);
  expect(screen.getByRole("spinbutton", { name: /height/i })).toHaveValue(172);
  expect(screen.getByRole("spinbutton", { name: /weight/i })).toHaveValue(63);
  expect(screen.getByRole("spinbutton", { name: /body fat/i })).toHaveValue(19);

  const walkingRow = screen.getByRole("heading", { name: "散歩", level: 3 }).closest("article");
  expect(walkingRow).not.toBeNull();

  expect(within(walkingRow!).getByRole("checkbox", { name: /done/i })).toBeChecked();
  expect(within(walkingRow!).getByRole("spinbutton", { name: /count/i })).toHaveValue(1);
  expect(within(walkingRow!).getByRole("spinbutton", { name: /minutes/i })).toHaveValue(20);
  expect(within(walkingRow!).getByRole("textbox", { name: /note/i })).toHaveValue("Evening walk");
});

test("renders self care labels even when only task 3 translation keys are available", async () => {
  const task3Messages = {
    self_care_heading: "Self Care",
    self_care_description: "Save a short self care note for today.",
    today_loading_heading: "Loading today's log...",
    today_loading_text: "Checking your saved condition and exercise results for this day.",
    history_condition_heading: "Condition",
    condition_note_label: "Note",
    condition_note_placeholder: "Add anything worth remembering for today.",
    condition_save_button: "Save condition",
    meta_duration: "Duration",
  } as Messages;

  render(
    <LanguageContext.Provider
      value={{ language: "en", messages: task3Messages, setLanguage: () => undefined }}
    >
      <SelfCareScreen date="2026-03-25" />
    </LanguageContext.Provider>,
  );

  expect(await screen.findByRole("spinbutton", { name: /physical score/i })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: /height/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save condition/i })).toBeInTheDocument();
});
