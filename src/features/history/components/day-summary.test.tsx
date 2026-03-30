import { describe, it, expect, vi } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import { DaySummary } from "./day-summary";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/features/storage/exercise-logs.repository", () => ({
  deleteExerciseLog: vi.fn(),
  updateExerciseLog: vi.fn(),
}));
vi.mock("@/features/storage/daily-condition.repository", () => ({
  deleteDailyCondition: vi.fn(),
  updateDailyCondition: vi.fn(),
}));
vi.mock("@/features/storage/exercise-catalog.repository", () => ({
  listAllExercises: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/date/local-iso", () => ({
  localIsoNow: vi.fn().mockReturnValue("2024-01-15T09:00:00+09:00"),
}));

const baseLog = {
  id: "log1",
  exerciseId: "ex1",
  title: "Push-ups",
  result: "did" as const,
  loggedAt: "2024-01-15T09:00:00+09:00",
};

const makeSummary = (overrides = {}) => ({
  logs: [baseLog],
  conditionLevel: "good" as const,
  note: "Felt great",
  updatedAt: "2024-01-15T09:30:00+09:00",
  ...overrides,
});

describe("DaySummary timestamps", () => {
  it("renders loggedAt time in the log list", async () => {
    await act(async () => {
      render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
    });
    const list = screen.getByRole("list");
    expect(within(list).getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("renders updatedAt time in the condition section when present", async () => {
    await act(async () => {
      render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
    });
    const conditionHeading = screen.getByText("history_condition_heading");
    const conditionSection = conditionHeading.closest("div")!;
    expect(within(conditionSection).getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("does not render updatedAt time in condition section when updatedAt is null", async () => {
    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({ updatedAt: null })}
        />
      );
    });
    const conditionHeading = screen.getByText("history_condition_heading");
    const conditionSection = conditionHeading.closest("div")!;
    expect(within(conditionSection).queryByText(/\d{2}:\d{2}/)).toBeNull();
  });
});
