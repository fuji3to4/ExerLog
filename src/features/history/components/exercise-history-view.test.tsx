import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

import { appDb } from "@/features/storage/app-db";
import { toDayKey } from "@/lib/date/day-key";
import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseHistoryView } from "./exercise-history-view";

beforeEach(async () => {
  await appDb.exerciseLogs.clear();
});

describe("ExerciseHistoryView", () => {
  it("shows the empty message when nothing is logged in the range", async () => {
    renderWithLanguage(<ExerciseHistoryView />, { initialLanguage: "ja" });
    expect(await screen.findByText("選択した範囲に利用可能なデータがありません。")).toBeInTheDocument();
  });

  it("shows per-exercise and per-day charts and switches between count and time", async () => {
    const user = userEvent.setup();
    const today = toDayKey(new Date());
    await appDb.exerciseLogs.add({
      id: "log-1",
      exerciseId: "neck-mobility-5",
      date: today,
      result: "did",
      durationSeconds: 300,
      performedAt: `${today}T09:00:00+09:00`,
      updatedAt: `${today}T09:00:00+09:00`,
    });

    renderWithLanguage(<ExerciseHistoryView />, { initialLanguage: "ja" });

    expect(await screen.findByRole("heading", { name: "運動ごと" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "日ごと" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("表示する項目"), "minutes");
    expect(screen.getByRole("option", { name: "時間" })).toHaveProperty("selected", true);
    expect(await screen.findByRole("heading", { name: "運動ごと" })).toBeInTheDocument();
  });
});
