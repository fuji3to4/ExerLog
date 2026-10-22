import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { appDb } from "@/features/storage/app-db";
import { addMeasurement } from "@/features/storage/measurements.repository";
import { listWellnessEntriesForDay } from "@/features/storage/wellness-entries.repository";
import { renderWithLanguage } from "@/test/render-with-language";

import { SelfCareScreen } from "./components/self-care-screen";

beforeEach(async () => {
  window.localStorage.clear();
  await Promise.all([
    appDb.wellnessEntries.clear(),
    appDb.measurements.clear(),
    appDb.tombstones.clear(),
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Replaces the old metrics tests (inline height/weight/body-fat inputs, BMI from typed values,
// the metrics save button and its error state): body metrics are now recorded through the dialog.
test("has a single add-record button and no inline body-metric inputs", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const region = await screen.findByRole("region", { name: "体調" });
  expect(screen.getAllByRole("button", { name: "＋ 記録する" })).toHaveLength(1);
  expect(within(region).getByRole("button", { name: "＋ 記録する" })).toBeInTheDocument();
  expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "記録を保存" })).not.toBeInTheDocument();
});

test("shows the latest values with their times and BMI from the height known at that time", async () => {
  await addMeasurement({ date: "2026-10-01", values: { height: 170 }, note: "", recordedAt: "2026-10-01T08:00:00+09:00" });
  await addMeasurement({ date: "2026-10-22", values: { weight: 60 }, note: "", recordedAt: "2026-10-22T07:12:00+09:00" });

  renderWithLanguage(<SelfCareScreen date="2026-10-22" />, { initialLanguage: "ja" });

  expect(await screen.findByText("体重 60.0kg（10/22 07:12）")).toBeInTheDocument();
  expect(screen.getByText("身長 170.0cm（10/1 08:00）")).toBeInTheDocument();
  expect(screen.getByText("体脂肪率 —")).toBeInTheDocument();
  expect(screen.getByText("BMI 20.8")).toBeInTheDocument();
});

test("shows dashes and no BMI when nothing is recorded", async () => {
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });
  expect(await screen.findByText("体重 —")).toBeInTheDocument();
  expect(screen.queryByText(/BMI/)).not.toBeInTheDocument();
});

test("asks for height when only a weight is recorded", async () => {
  await addMeasurement({ date: "2026-10-20", values: { weight: 60 }, note: "" });
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });
  expect(await screen.findByText("身長を記録するとBMIが出ます")).toBeInTheDocument();
});

test("saving body metrics from the card refreshes the latest values and flashes the button", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const region = await screen.findByRole("region", { name: "体調" });
  await user.click(within(region).getByRole("button", { name: "＋ 記録する" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("tab", { name: "体の数値" }));
  fireEvent.change(within(dialog).getByLabelText("体重"), { target: { value: "61.5" } });
  await user.click(within(dialog).getByRole("button", { name: "保存" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(within(region).getByRole("button", { name: "✓ 保存しました" })).toBeInTheDocument();
  expect(await within(region).findByText(/^体重 61\.5kg（10\/20 \d{2}:\d{2}）$/)).toBeInTheDocument();
});

test("logs wellness through the card's dialog", async () => {
  const user = userEvent.setup();
  renderWithLanguage(<SelfCareScreen date="2026-10-20" />, { initialLanguage: "ja" });

  const region = await screen.findByRole("region", { name: "体調" });
  await user.click(within(region).getByRole("button", { name: "＋ 記録する" }));

  const dialog = await screen.findByRole("dialog");
  const physicalGroup = within(dialog).getByRole("group", { name: "からだ" });
  await user.click(within(physicalGroup).getByRole("button", { name: "4" }));
  await user.click(within(dialog).getByRole("button", { name: "保存" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(within(region).getByRole("button", { name: "✓ 保存しました" })).toBeInTheDocument();

  const entries = await listWellnessEntriesForDay("2026-10-20");
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ date: "2026-10-20", physicalScore: 4, mentalScore: 3 });
});
