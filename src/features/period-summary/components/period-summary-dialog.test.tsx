import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { bodyRepository } from "@/features/modules/body/data";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { addWellnessEntry } from "@/features/modules/wellness/data";
import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { renderWithLanguage } from "@/test/render-with-language";
import { defaultPeriod, PeriodSummaryDialog } from "./period-summary-dialog";

const PERIOD = { start: "2026-10-01T00:00:00+09:00", end: "2026-10-27T23:00:00+09:00" };

beforeEach(async () => {
  window.localStorage.removeItem("lymly-record-modules");
  await Promise.all([
    appDb.exerciseLogs.clear(),
    appDb.wellnessEntries.clear(),
    appDb.exercises.clear(),
    appDb.bodyRecords.clear(),
    appDb.circumferenceRecords.clear(),
  ]);
  await appDb.exercises.bulkAdd(exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" })));
});

function renderDialog() {
  return renderWithLanguage(<PeriodSummaryDialog open onOpenChange={vi.fn()} initialPeriod={PERIOD} />, {
    initialLanguage: "ja",
  });
}

function headings() {
  return within(screen.getByRole("dialog"))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

describe("PeriodSummaryDialog", () => {
  it("shows enabled module cards in settings order, then exercise", async () => {
    window.localStorage.setItem(
      "lymly-record-modules",
      JSON.stringify({ order: ["circumference", "body", "wellness"], disabled: ["wellness"] }),
    );
    renderDialog();
    await waitFor(() => expect(screen.getAllByText("記録なし").length).toBeGreaterThan(0));
    expect(headings()).toEqual(["周径", "身体", "写真", "運動"]);
  });

  it("shows 記録なし for a module without records and the summary for one with records", async () => {
    await addWellnessEntry({
      date: "2026-10-20",
      recordedAt: "2026-10-20T09:00:00+09:00",
      physicalScore: 4,
      mentalScore: 2,
      note: "",
    });
    await bodyRepository.add({
      date: "2026-10-02",
      recordedAt: "2026-10-02T08:00:00+09:00",
      values: { weight: 61, height: 160 },
      note: "",
    });
    await bodyRepository.add({
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      values: { weight: 60.2 },
      note: "",
    });
    // Outside the period: must not be counted.
    await circumferenceRepository.add({
      date: "2026-09-20",
      recordedAt: "2026-09-20T08:00:00+09:00",
      values: { armWristLeft: 15 },
      note: "",
    });
    await addExerciseLog({
      date: "2026-10-21",
      exerciseId: exerciseCatalog[0].id,
      result: "did",
      durationSeconds: 125,
      performedAt: "2026-10-21T09:00:00+09:00",
    });
    renderDialog();

    expect(await screen.findByText("61.0kg → 60.2kg（−0.8）")).toBeTruthy();
    expect(screen.getByText("BMI 23.5")).toBeTruthy();
    expect(screen.getByText("合計 2:05")).toBeTruthy();
    expect(screen.getByText(exerciseCatalog[0].title)).toBeTruthy();
    const circumference = screen.getByRole("heading", { name: "周径" }).closest("section")!;
    await waitFor(() => expect(within(circumference).getByText("記録なし")).toBeTruthy());
  });

  it("shows BMI when the only height record is before the period", async () => {
    await bodyRepository.add({
      date: "2026-09-15",
      recordedAt: "2026-09-15T08:00:00+09:00",
      values: { height: 160 },
      note: "",
    });
    await bodyRepository.add({
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      values: { weight: 60.2 },
      note: "",
    });
    renderDialog();
    expect(await screen.findByText("BMI 23.5")).toBeTruthy();
  });

  it("includes a record from the final minute of an edited end time", async () => {
    await addWellnessEntry({
      date: "2026-10-27",
      recordedAt: "2026-10-27T10:30:20+09:00",
      physicalScore: 4,
      mentalScore: 2,
      note: "",
    });
    renderDialog();
    fireEvent.change(screen.getByLabelText("終了"), { target: { value: "2026-10-27T10:30" } });
    const wellness = screen.getByRole("heading", { name: "体調" }).closest("section")!;
    expect(await within(wellness).findByText("1件")).toBeTruthy();
  });

  it("shows the invalid message and no cards when start is after end", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("開始"), { target: { value: "2026-11-01T09:00" } });
    expect(await screen.findByText("開始は終了より前にしてください")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("defaultPeriod is 30 days before now to now", () => {
    const period = defaultPeriod(new Date(2026, 9, 27, 10, 30, 0));
    expect(period.start.startsWith("2026-09-27T10:30:00")).toBe(true);
    expect(period.end.startsWith("2026-10-27T10:30:00")).toBe(true);
  });
});
