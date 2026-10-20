import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, act, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaySummary } from "./day-summary";
import { upsertDailyMetric, deleteDailyMetric } from "@/features/storage/daily-metrics.repository";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/features/storage/daily-metrics.repository", () => ({
  upsertDailyMetric: vi.fn(),
  deleteDailyMetric: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const weightMetric = { metricType: "weight" as const, value: 62, unit: "kg" };

const makeSummary = (overrides = {}) => ({
  metrics: [weightMetric],
  selfCareLogs: [],
  ...overrides,
});

describe("DaySummary", () => {
  it("renders metrics and self-care sections when data exists", async () => {
    await act(async () => {
      render(
        <DaySummary
          selectedDate="2024-01-15"
          summary={makeSummary({
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

    expect(screen.queryByText("history_wellness_heading")).not.toBeInTheDocument();
    expect(screen.queryByText("history_exercises_heading")).not.toBeInTheDocument();
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

    expect(screen.getByRole("switch", { name: "history_mode_edit" })).not.toBeChecked();
    expect(screen.getByText("history_mode_view")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "action_edit" })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "history_metrics_delete_weight" })).not.toBeInTheDocument();
  });

  it("shows action buttons after switching to edit mode via switch", async () => {
    await act(async () => {
      render(<DaySummary selectedDate="2024-01-15" summary={makeSummary()} />);
    });

    fireEvent.click(screen.getByRole("switch", { name: "history_mode_edit" }));

    expect(screen.getByRole("switch", { name: "history_mode_edit" })).toBeChecked();
    expect(screen.getByText("history_mode_edit")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "action_edit" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "history_metrics_delete_weight" })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("switch", { name: "history_mode_edit" }));

    expect(screen.getByRole("button", { name: "history_metrics_add_height" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "history_metrics_add_body_fat" })).toBeInTheDocument();
  });

  it("calls upsertDailyMetric and onChanged when adding a metric", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

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

    await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
    await user.click(screen.getByRole("button", { name: "history_metrics_add_height" }));
    await user.type(screen.getByLabelText("self_care_metric_height"), "170");
    await user.click(screen.getByRole("button", { name: "history_edit_save" }));

    expect(upsertDailyMetric).toHaveBeenCalledWith("2024-01-15", {
      metricType: "height",
      value: 170,
      unit: "cm",
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("does not call upsertDailyMetric when the metric input is empty", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();

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

    await user.click(screen.getByRole("switch", { name: "history_mode_edit" }));
    await user.click(screen.getByRole("button", { name: "history_metrics_add_height" }));
    await user.click(screen.getByRole("button", { name: "history_edit_save" }));

    expect(upsertDailyMetric).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByRole("switch", { name: "history_mode_edit" }));
    fireEvent.click(screen.getByRole("button", { name: "history_metrics_delete_weight" }));

    expect(confirmSpy).toHaveBeenCalledWith("history_metric_delete_confirm");
    expect(deleteDailyMetric).toHaveBeenCalledWith("2024-01-15", "weight");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });
});
