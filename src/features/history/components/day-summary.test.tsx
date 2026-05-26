import { describe, it, expect, vi } from "vitest";
import { render, screen, within, act, fireEvent, waitFor } from "@testing-library/react";
import { DaySummary } from "./day-summary";
import { deleteDailyMetric } from "@/features/storage/daily-metrics.repository";
import { deleteDailyWellness } from "@/features/storage/daily-wellness.repository";

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
vi.mock("@/features/storage/daily-metrics.repository", () => ({
  upsertDailyMetric: vi.fn(),
  deleteDailyMetric: vi.fn(),
}));
vi.mock("@/features/storage/daily-wellness.repository", () => ({
  saveDailyWellness: vi.fn(),
  deleteDailyWellness: vi.fn(),
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
  wellness: null,
  metrics: [],
  selfCareLogs: [],
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

  it("renders wellness, metrics, and self-care sections when data exists", async () => {
    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({
            wellness: {
              physicalScore: 4,
              mentalScore: 3,
              note: "Feeling steady",
            },
            metrics: [
              { metricType: "weight", value: 62, unit: "kg" },
              { metricType: "bodyFat", value: 18, unit: "%" },
            ],
            selfCareLogs: [
              {
                selfCareId: "stretching",
                title: "Stretching",
                isDone: true,
                count: 1,
                minutes: 10,
                note: "Loosened up",
              },
            ],
          })}
        />,
      );
    });

    expect(screen.getByText("history_wellness_heading")).toBeInTheDocument();
    expect(screen.getByText("self_care_physical_label")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(screen.getByText("self_care_mental_label")).toBeInTheDocument();
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect(screen.getByText("Feeling steady")).toBeInTheDocument();
    expect(screen.getByText("history_metrics_heading")).toBeInTheDocument();
    expect(screen.getByText("self_care_metric_weight")).toBeInTheDocument();
    expect(screen.getByText("62 kg")).toBeInTheDocument();
    expect(screen.getByText("self_care_metric_body_fat")).toBeInTheDocument();
    expect(screen.getByText("18 %")).toBeInTheDocument();
    expect(screen.getByText("history_self_care_heading")).toBeInTheDocument();
    expect(screen.getByText("Stretching")).toBeInTheDocument();
    expect(screen.getByText(/self_care_done_label/i)).toBeInTheDocument();
    expect(screen.getByText(/self_care_count_label: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/self_care_minutes_label: 10/i)).toBeInTheDocument();
    expect(screen.getByText("Loosened up")).toBeInTheDocument();
  });

  it("defaults to view mode and hides action buttons", async () => {
    await act(async () => {
      render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
    });

    expect(screen.getByRole("checkbox", { name: "history_mode_edit" })).not.toBeChecked();
    expect(screen.getByText("history_mode_view")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "action_edit" })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: "action_delete" })).toHaveLength(0);
  });

  it("shows action buttons after switching to edit mode via switch", async () => {
    await act(async () => {
      render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "history_mode_edit" }));

    expect(screen.getByRole("checkbox", { name: "history_mode_edit" })).toBeChecked();
    expect(screen.getByText("history_mode_edit")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "action_edit" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("button", { name: "action_delete" }).length).toBeGreaterThanOrEqual(2);
  });

  it("shows metric add controls when metric missing in edit mode", async () => {
    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({
            metrics: [{ metricType: "weight", value: 62, unit: "kg" }],
          })}
        />,
      );
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "history_mode_edit" }));

    expect(screen.getByRole("button", { name: "history_metrics_add_height" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "history_metrics_add_body_fat" })).toBeInTheDocument();
  });

  it("calls deleteDailyMetric for individual metric deletion", async () => {
    const onChanged = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({
            metrics: [{ metricType: "weight", value: 62, unit: "kg" }],
          })}
          onChanged={onChanged}
        />,
      );
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "history_mode_edit" }));
    fireEvent.click(screen.getByRole("button", { name: "history_metrics_delete_weight" }));

    expect(confirmSpy).toHaveBeenCalledWith("history_metric_delete_confirm");
    expect(deleteDailyMetric).toHaveBeenCalledWith("2024-01-15", "weight");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("calls deleteDailyWellness when deleting wellness", async () => {
    const onChanged = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({
            wellness: {
              physicalScore: 4,
              mentalScore: 3,
              note: "Feeling steady",
            },
          })}
          onChanged={onChanged}
        />,
      );
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "history_mode_edit" }));
    fireEvent.click(screen.getByRole("button", { name: "history_wellness_delete" }));

    expect(confirmSpy).toHaveBeenCalledWith("history_wellness_delete_confirm");
    expect(deleteDailyWellness).toHaveBeenCalledWith("2024-01-15");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });
});
