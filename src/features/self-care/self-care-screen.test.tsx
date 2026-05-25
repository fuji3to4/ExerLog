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

  const wellnessSection = (await screen.findByRole("heading", { name: /condition/i })).closest("section");
  expect(wellnessSection).not.toBeNull();
  const [physicalScoreInput, mentalScoreInput, heightInput, weightInput, bodyFatInput] =
    await screen.findAllByRole("spinbutton");

  fireEvent.change(physicalScoreInput, { target: { value: "4" } });
  fireEvent.change(mentalScoreInput, { target: { value: "3" } });
  const wellnessNoteInput = within(wellnessSection!).getByRole("textbox", { name: /^note$/i });
  fireEvent.change(wellnessNoteInput, { target: { value: "Slept better after lunch" } });
  fireEvent.change(heightInput, { target: { value: "171" } });
  fireEvent.change(weightInput, { target: { value: "62" } });
  fireEvent.change(bodyFatInput, { target: { value: "18" } });

  const stretchingRow = screen.getByRole("heading", { name: "ストレッチ", level: 3 }).closest("article");
  expect(stretchingRow).not.toBeNull();

  await user.click(within(stretchingRow!).getByRole("checkbox", { name: /did it/i }));

  const [countInput, minutesInput] = within(stretchingRow!).getAllByRole("spinbutton");

  fireEvent.change(countInput, { target: { value: "1" } });
  fireEvent.change(minutesInput, { target: { value: "10" } });
  fireEvent.change(within(stretchingRow!).getByRole("textbox", { name: /note/i }), {
    target: { value: "Felt looser" },
  });

  await user.click(screen.getByRole("button", { name: /save condition/i }));

  await waitFor(async () => {
    await expect(getDailyWellness("2026-03-23")).resolves.toMatchObject({
      physicalScore: 4,
      mentalScore: 3,
      note: "Slept better after lunch",
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
    note: "Needed extra rest",
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

  const wellnessSection = (await screen.findByRole("heading", { name: /condition/i })).closest("section");
  expect(wellnessSection).not.toBeNull();
  const [physicalScoreInput, mentalScoreInput, heightInput, weightInput, bodyFatInput] =
    await screen.findAllByRole("spinbutton");
  const wellnessNoteInput = within(wellnessSection!).getByRole("textbox", { name: /^note$/i });

  expect(physicalScoreInput).toHaveValue(5);
  expect(mentalScoreInput).toHaveValue(2);
  expect(wellnessNoteInput).toHaveValue("Needed extra rest");
  expect(heightInput).toHaveValue(172);
  expect(weightInput).toHaveValue(63);
  expect(bodyFatInput).toHaveValue(19);

  const walkingRow = screen.getByRole("heading", { name: "散歩", level: 3 }).closest("article");
  expect(walkingRow).not.toBeNull();

  expect(within(walkingRow!).getByRole("checkbox", { name: /did it/i })).toBeChecked();

  const [countInput, minutesInput] = within(walkingRow!).getAllByRole("spinbutton");

  expect(countInput).toHaveValue(1);
  expect(minutesInput).toHaveValue(20);
  expect(within(walkingRow!).getByRole("textbox", { name: /note/i })).toHaveValue("Evening walk");
});

test("renders self care labels even when only task 3 translation keys are available", async () => {
  const task3Messages = {
    self_care_heading: "Self Care",
    self_care_description: "Save a short self care note for today.",
    today_loading_heading: "Loading today's log...",
    today_loading_text: "Checking your saved condition and exercise results for this day.",
    condition_heading: "Daily condition",
    history_condition_heading: "Condition",
    history_exercises_heading: "Exercises",
    meta_intensity: "Intensity",
    result_did: "Did it",
    condition_note_label: "Note",
    condition_note_placeholder: "Add anything worth remembering for today.",
    condition_save_button: "Save condition",
    settings_form_duration_label: "Duration (minutes)",
  } as Messages;

  render(
    <LanguageContext.Provider
      value={{ language: "en", messages: task3Messages, setLanguage: () => undefined }}
    >
      <SelfCareScreen date="2026-03-25" />
    </LanguageContext.Provider>,
  );

  expect((await screen.findAllByRole("checkbox", { name: /did it/i })).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: /save condition/i })).toBeInTheDocument();
});
