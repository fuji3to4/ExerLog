import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { LanguageContext } from "@/features/i18n/language-provider";
import type { Messages } from "@/features/i18n/messages";
import { renderWithLanguage } from "@/test/render-with-language";
import { appDb } from "@/features/storage/app-db";
import * as dailyMetricsRepository from "@/features/storage/daily-metrics.repository";
import { listDailyMetricsByDate, replaceDailyMetrics } from "@/features/storage/daily-metrics.repository";
import { listWellnessEntriesForDay } from "@/features/storage/wellness-entries.repository";

import { SelfCareScreen } from "./components/self-care-screen";

beforeEach(async () => {
  await Promise.all([
    appDb.wellnessEntries.clear(),
    appDb.dailyMetrics.clear(),
    appDb.dailySelfCareLogs.clear(),
    appDb.selfCareCatalog.clear(),
    appDb.tombstones.clear(),
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function getMetricInputs() {
  const metricsRegion = await screen.findByRole("region", { name: /metrics|測定値/i });
  const [heightInput, weightInput, bodyFatInput] = within(metricsRegion).getAllByRole("spinbutton");
  return { metricsRegion, heightInput, weightInput, bodyFatInput };
}

// Replaces the old combined wellness+metrics save test: the screen now saves body metrics only.
test("saves only body metrics from the self-care screen", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });

  const { heightInput, weightInput, bodyFatInput } = await getMetricInputs();
  fireEvent.change(heightInput, { target: { value: "171" } });
  fireEvent.change(weightInput, { target: { value: "62" } });
  fireEvent.change(bodyFatInput, { target: { value: "18" } });

  await user.click(screen.getByRole("button", { name: /save check-in/i }));
  expect(await screen.findByRole("button", { name: "✓ Saved" })).toBeInTheDocument();

  await waitFor(async () => {
    await expect(listDailyMetricsByDate("2026-03-23")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricType: "height", value: 171, unit: "cm" }),
        expect.objectContaining({ metricType: "weight", value: 62, unit: "kg" }),
        expect.objectContaining({ metricType: "bodyFat", value: 18, unit: "%" }),
      ]),
    );
  });
  await expect(listWellnessEntriesForDay("2026-03-23")).resolves.toEqual([]);
});

// Replaces the old hydrate test: wellness is no longer hydrated into this screen.
test("hydrates saved metrics on first render", async () => {
  await replaceDailyMetrics("2026-03-24", [
    { metricType: "height", value: 172, unit: "cm" },
    { metricType: "weight", value: 63, unit: "kg" },
    { metricType: "bodyFat", value: 19, unit: "%" },
  ]);

  renderWithLanguage(<SelfCareScreen date="2026-03-24" />, { initialLanguage: "en" });

  const { heightInput, weightInput, bodyFatInput } = await getMetricInputs();
  expect(heightInput).toHaveValue(172);
  expect(weightInput).toHaveValue(63);
  expect(bodyFatInput).toHaveValue(19);
  expect(screen.queryByRole("checkbox", { name: /did it/i })).not.toBeInTheDocument();
});

test("renders self-care wellness and metrics without legacy global hook classes", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-03-23" />, { initialLanguage: "en" });

  const wellnessRegion = await screen.findByRole("region", { name: /condition/i });
  const metricsRegion = screen.getByRole("region", { name: /metrics/i });

  expect(within(wellnessRegion).getByRole("button", { name: "+ Log condition" })).toBeInTheDocument();
  expect(within(wellnessRegion).queryByRole("group", { name: /physical/i })).not.toBeInTheDocument();
  expect(within(metricsRegion).getAllByRole("spinbutton")).toHaveLength(3);

  expect(document.querySelector(".self-care-screen__date")).not.toBeInTheDocument();
  expect(document.querySelector(".self-care-screen__section-heading")).not.toBeInTheDocument();
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
    self_care_condition_heading: "Condition",
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

test("shows BMI from the latest earlier height when weight is entered", async () => {
  await replaceDailyMetrics("2026-10-01", [{ metricType: "height", value: 170, unit: "cm" }]);

  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { metricsRegion, heightInput, weightInput } = await getMetricInputs();
  expect(heightInput).toHaveValue(null);
  expect(within(metricsRegion).queryByText(/BMI/)).not.toBeInTheDocument();

  fireEvent.change(weightInput, { target: { value: "60" } });

  expect(await within(metricsRegion).findByText("BMI 20.8")).toBeInTheDocument();
});

test("uses the height typed on screen over the stored height", async () => {
  await replaceDailyMetrics("2026-10-01", [{ metricType: "height", value: 150, unit: "cm" }]);

  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { metricsRegion, heightInput, weightInput } = await getMetricInputs();
  fireEvent.change(heightInput, { target: { value: "173.2" } });
  fireEvent.change(weightInput, { target: { value: "60" } });

  // 60 / 1.732^2 = 20.0 -> one decimal is always shown
  expect(await within(metricsRegion).findByText("BMI 20.0")).toBeInTheDocument();
});

test("ignores heights recorded after the screen's date", async () => {
  await replaceDailyMetrics("2026-10-21", [{ metricType: "height", value: 170, unit: "cm" }]);

  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { metricsRegion, weightInput } = await getMetricInputs();
  fireEvent.change(weightInput, { target: { value: "60" } });

  expect(await within(metricsRegion).findByText("身長を記録するとBMIが出ます")).toBeInTheDocument();
});

test("asks for height when weight is entered and no height is known", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { metricsRegion, weightInput } = await getMetricInputs();
  fireEvent.change(weightInput, { target: { value: "60" } });

  expect(await within(metricsRegion).findByText("身長を記録するとBMIが出ます")).toBeInTheDocument();
  expect(within(metricsRegion).queryByText(/BMI \d/)).not.toBeInTheDocument();
});

test("flashes the save button after a successful save", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { weightInput } = await getMetricInputs();
  fireEvent.change(weightInput, { target: { value: "60" } });

  await user.click(screen.getByRole("button", { name: "記録を保存" }));

  expect(await screen.findByRole("button", { name: "✓ 保存しました" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("shows an inline error and no flash when saving fails", async () => {
  const user = userEvent.setup();
  vi.spyOn(dailyMetricsRepository, "replaceDailyMetrics").mockRejectedValueOnce(new Error("boom"));
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const { weightInput } = await getMetricInputs();
  fireEvent.change(weightInput, { target: { value: "60" } });

  await user.click(screen.getByRole("button", { name: "記録を保存" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("保存できませんでした。もう一度お試しください。");
  expect(screen.queryByRole("button", { name: "✓ 保存しました" })).not.toBeInTheDocument();
});

test("logs wellness through the add dialog and flashes the wellness button", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const wellnessRegion = await screen.findByRole("region", { name: "体調" });
  await user.click(within(wellnessRegion).getByRole("button", { name: "＋ 体調を記録" }));

  const dialog = await screen.findByRole("dialog");
  const physicalGroup = within(dialog).getByRole("group", { name: "からだ" });
  await user.click(within(physicalGroup).getByRole("button", { name: "4" }));
  await user.click(within(dialog).getByRole("button", { name: "保存" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(within(wellnessRegion).getByRole("button", { name: "✓ 保存しました" })).toBeInTheDocument();

  const entries = await listWellnessEntriesForDay("2026-10-20");
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ date: "2026-10-20", physicalScore: 4, mentalScore: 3 });
});
