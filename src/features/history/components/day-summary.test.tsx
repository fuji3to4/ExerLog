import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaySummary } from "./day-summary";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("DaySummary", () => {
  it("renders only the self-care section", () => {
    render(
      <DaySummary
        selectedDate="2024-01-15"
        summary={{
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
        }}
      />,
    );

    expect(screen.queryByText("history_metrics_heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("history_self_care_heading")).toBeInTheDocument();
    expect(screen.getByText("Stretching")).toBeInTheDocument();
    expect(screen.getByText(/self_care_done_label/i)).toBeInTheDocument();
    expect(screen.getByText(/self_care_count_label: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/self_care_minutes_label: 10/i)).toBeInTheDocument();
    expect(screen.getByText("Loosened up")).toBeInTheDocument();
  });

  it("asks to pick a day when none is selected", () => {
    render(<DaySummary selectedDate={null} summary={null} />);

    expect(screen.getByText("history_day_summary_empty")).toBeInTheDocument();
  });
});
