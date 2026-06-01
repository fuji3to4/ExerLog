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

test("saves only wellness and metrics from the self-care screen", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });

  const wellnessRegion = await screen.findByRole("region", { name: /condition/i });
  const metricsRegion = screen.getByRole("region", { name: /metrics/i });

  const physicalGroup = within(wellnessRegion).getByRole("group", { name: /physical/i });
  fireEvent.click(within(physicalGroup).getByRole("button", { name: "4" }));

  const mentalGroup = within(wellnessRegion).getByRole("group", { name: /mental/i });
  fireEvent.click(within(mentalGroup).getByRole("button", { name: "3" }));

  const [heightInput, weightInput, bodyFatInput] = within(metricsRegion).getAllByRole("spinbutton");
  const wellnessNoteInput = within(wellnessRegion).getByRole("textbox", { name: /^note$/i });
  fireEvent.change(wellnessNoteInput, { target: { value: "Slept better after lunch" } });
  fireEvent.change(heightInput, { target: { value: "171" } });
  fireEvent.change(weightInput, { target: { value: "62" } });
  fireEvent.change(bodyFatInput, { target: { value: "18" } });

  expect(screen.queryByRole("checkbox", { name: /did it/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /save check-in/i }));

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
    await expect(listDailySelfCareEntriesByDate("2026-03-23")).resolves.toEqual([]);
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

  const wellnessRegion = await screen.findByRole("region", { name: /condition/i });
  const metricsRegion = screen.getByRole("region", { name: /metrics/i });
  const [heightInput, weightInput, bodyFatInput] = within(metricsRegion).getAllByRole("spinbutton");
  const wellnessNoteInput = within(wellnessRegion).getByRole("textbox", { name: /^note$/i });

  const physicalGroup = within(wellnessRegion).getByRole("group", { name: /physical/i });
  const mentalGroup = within(wellnessRegion).getByRole("group", { name: /mental/i });
  expect(within(physicalGroup).getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
  expect(within(mentalGroup).getByRole("button", { name: "2" })).toHaveAttribute("aria-pressed", "true");
  expect(wellnessNoteInput).toHaveValue("Needed extra rest");
  expect(heightInput).toHaveValue(172);
  expect(weightInput).toHaveValue(63);
  expect(bodyFatInput).toHaveValue(19);

  expect(screen.queryByRole("checkbox", { name: /did it/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "散歩", level: 3 })).not.toBeInTheDocument();
});

test("renders self-care wellness and metrics without legacy global hook classes", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });

  const wellnessRegion = await screen.findByRole("region", { name: /condition/i });
  const metricsRegion = screen.getByRole("region", { name: /metrics/i });

  expect(within(wellnessRegion).getByRole("group", { name: /physical/i })).toBeInTheDocument();
  expect(within(wellnessRegion).getByRole("textbox", { name: /^note$/i })).toBeInTheDocument();
  expect(within(metricsRegion).getAllByRole("spinbutton")).toHaveLength(3);

  expect(document.querySelector(".self-care-screen__field")).not.toBeInTheDocument();
  expect(document.querySelector(".self-care-screen__metric-input")).not.toBeInTheDocument();
  expect(document.querySelector(".self-care-screen__section")).not.toBeInTheDocument();
  expect(document.querySelector(".self-care-screen__metrics-grid")).not.toBeInTheDocument();
});

test("renders wellness save controls even when only condition screen translation keys are available", async () => {
  const conditionMessages = {
    self_care_heading: "Condition",
    self_care_subheading: "Review your body and mind, then save a quick wellness check-in.",
    self_care_save_button: "Save check-in",
    today_loading_heading: "Loading today's log...",
    today_loading_text: "Checking your saved condition and exercise results for this day.",
    condition_heading: "Daily condition",
    history_condition_heading: "Condition",
    history_exercises_heading: "Exercises",
    meta_intensity: "Intensity",
    result_did: "Did it",
    condition_note_label: "Note",
    condition_note_placeholder: "Add anything worth remembering for today.",
    settings_form_duration_label: "Duration (minutes)",
  } as Messages;

  render(
    <LanguageContext.Provider
      value={{ language: "en", messages: conditionMessages, setLanguage: () => undefined }}
    >
      <SelfCareScreen date="2026-03-25" />
    </LanguageContext.Provider>,
  );

  expect(screen.queryByRole("checkbox", { name: /did it/i })).not.toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /save check-in/i })).toBeInTheDocument();
});
