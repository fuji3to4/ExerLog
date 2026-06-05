import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HistoryChart } from "./history-chart";
import type { GraphSeries } from "../history-graph-query";

// Mock Recharts to render without ResponsiveContainer constraints in JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container" style={{ width: 800, height: 600 }}>
        {children}
      </div>
    ),
    AreaChart: (props: any) => (
      <original.AreaChart {...props} width={800} height={600}>
        {props.children}
      </original.AreaChart>
    ),
  };
});

// ResizeObserver mock
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as any;

describe("HistoryChart", () => {
  const mockSeries: GraphSeries = {
    label: "Weight",
    unit: "kg",
    points: [
      { date: "2026-06-01", value: 70 },
      { date: "2026-06-02", value: 71 },
      { date: "2026-06-03", value: 69.5 },
    ],
  };

  it("renders correctly with provided series data", () => {
    const { container } = render(<HistoryChart series={mockSeries} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("renders the correct number of dots matching data points", () => {
    const { container } = render(<HistoryChart series={mockSeries} />);

    // AreaChart with dot={true} renders .recharts-dot elements
    const dots = container.querySelectorAll(".recharts-dot");
    expect(dots.length).toBe(mockSeries.points.length);
  });

  it("displays x-axis date labels", () => {
    render(<HistoryChart series={mockSeries} />);

    // Check if formatted dates are visible, using getAllByText to avoid Recharts measurement spans
    expect(screen.getAllByText("6/1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("6/2")[0]).toBeInTheDocument();
    expect(screen.getAllByText("6/3")[0]).toBeInTheDocument();
  });

  it("displays x-axis date labels correctly with gapped dates", () => {
    const gappedSeries: GraphSeries = {
      label: "Weight",
      unit: "kg",
      points: [
        { date: "2026-06-01", value: 70 },
        { date: "2026-06-05", value: 72 }, // 4 days gap
      ],
    };
    const { container } = render(<HistoryChart series={gappedSeries} />);

    const dots = container.querySelectorAll(".recharts-dot");
    expect(dots.length).toBe(gappedSeries.points.length);

    // Use getAllByText to avoid matching Recharts internal measurement spans
    expect(screen.getAllByText("6/1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("6/5")[0]).toBeInTheDocument();
  });
});
