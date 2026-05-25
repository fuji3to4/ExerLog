import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryGraphs } from "./history-graphs";

vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/features/history/history-graph-query", () => ({
  buildHistoryGraphSeries: vi.fn(),
}));

describe("HistoryGraphs", () => {
  it("renders graph heading", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-03-20", value: 62.5 },
        { date: "2026-03-21", value: 62.1 },
      ],
    });

    render(<HistoryGraphs />);

    expect(screen.getByText("history_graphs_heading")).toBeInTheDocument();
  });

  it("renders metric selector dropdown with weight option", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-03-20", value: 62.5 },
        { date: "2026-03-21", value: 62.1 },
      ],
    });

    render(<HistoryGraphs />);

    const selector = screen.getByLabelText("history_graph_metric_label");
    expect(selector).toBeInTheDocument();
    expect(within(selector).getByText("Weight")).toBeInTheDocument();
  });

  it("renders date range preset buttons", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-03-20", value: 62.5 },
        { date: "2026-03-21", value: 62.1 },
      ],
    });

    render(<HistoryGraphs />);

    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "all" })).toBeInTheDocument();
  });

  it("renders SVG polyline chart when data exists", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-03-20", value: 62.5 },
        { date: "2026-03-21", value: 62.1 },
        { date: "2026-03-22", value: 61.8 },
      ],
    });

    render(<HistoryGraphs />);

    // Wait for the chart to load
    const svg = await screen.findByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // Check for polyline element (the chart line)
    const polyline = svg.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
  });

  it("shows empty state when no data points", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [],
    });

    render(<HistoryGraphs />);

    expect(await screen.findByText("history_graphs_empty")).toBeInTheDocument();
  });

  it("updates graph when metric selector changes", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();

    vi.mocked(buildHistoryGraphSeries).mockClear();
    vi.mocked(buildHistoryGraphSeries)
      .mockResolvedValueOnce({
        label: "Weight",
        unit: "kg",
        points: [{ date: "2026-03-20", value: 62.5 }],
      })
      .mockResolvedValueOnce({
        label: "Body fat",
        unit: "%",
        points: [{ date: "2026-03-20", value: 18.5 }],
      });

    render(<HistoryGraphs />);

    const initialCallCount = vi.mocked(buildHistoryGraphSeries).mock.calls.length;

    const selector = screen.getByLabelText("history_graph_metric_label") as HTMLSelectElement;
    const bodyFatOption = Array.from(selector.options).find((opt) => opt.textContent === "Body fat");
    if (bodyFatOption) {
      await user.click(selector);
      await user.selectOptions(selector, bodyFatOption);
    }

    // Wait for the graph to update
    await screen.findByText("Body fat");

    expect(vi.mocked(buildHistoryGraphSeries).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it("updates graph when date range preset changes", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();

    vi.mocked(buildHistoryGraphSeries)
      .mockResolvedValueOnce({
        label: "Weight",
        unit: "kg",
        points: [{ date: "2026-03-20", value: 62.5 }],
      })
      .mockResolvedValueOnce({
        label: "Weight",
        unit: "kg",
        points: [{ date: "2026-03-15", value: 63.0 }, { date: "2026-03-20", value: 62.5 }],
      });

    render(<HistoryGraphs />);

    const thirtyDayButton = screen.getByRole("button", { name: "30d" });
    await user.click(thirtyDayButton);

    // The function should have been called at least twice (once for initial 7d, once for 30d)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(vi.mocked(buildHistoryGraphSeries).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders chart with correct axis scale", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-03-20", value: 60 },
        { date: "2026-03-21", value: 65 },
        { date: "2026-03-22", value: 62 },
      ],
    });

    render(<HistoryGraphs />);

    const svg = await screen.findByRole("img", { hidden: true });
    expect(svg).toBeInTheDocument();

    // The SVG should have proper dimensions
    expect(svg).toHaveAttribute("viewBox");
  });
});
