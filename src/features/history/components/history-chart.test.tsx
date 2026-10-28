import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { localIsoAt } from "@/lib/date/local-iso";
import { HistoryChart, formatPointTime, formatPointValue } from "./history-chart";
import type { GraphSeries } from "./metric-graph-view";

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

/** Local midnight of `day`, so the "M/D" ticks do not depend on the test machine's timezone. */
const midnight = (day: string) => localIsoAt(day, new Date(2000, 0, 1, 0, 0, 0));

describe("HistoryChart", () => {
  const mockSeries: GraphSeries = {
    unit: "kg",
    decimals: 1,
    points: [
      { at: midnight("2026-06-01"), value: 70 },
      { at: midnight("2026-06-02"), value: 71 },
      { at: midnight("2026-06-03"), value: 69.5 },
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
      unit: "kg",
      decimals: 1,
      points: [
        { at: midnight("2026-06-01"), value: 70 },
        { at: midnight("2026-06-05"), value: 72 }, // 4 days gap
      ],
    };
    const { container } = render(<HistoryChart series={gappedSeries} />);

    const dots = container.querySelectorAll(".recharts-dot");
    expect(dots.length).toBe(gappedSeries.points.length);

    // Use getAllByText to avoid matching Recharts internal measurement spans
    expect(screen.getAllByText("6/1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("6/5")[0]).toBeInTheDocument();
  });

  it("draws one dot per point when a day has several records", () => {
    const sameDay: GraphSeries = {
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-10-22T07:12:00+09:00", value: 60.2 },
        { at: "2026-10-22T21:00:00+09:00", value: 60.9 },
      ],
    };
    const { container } = render(<HistoryChart series={sameDay} />);

    expect(container.querySelectorAll(".recharts-dot").length).toBe(2);
    expect(formatPointTime(sameDay.points[0]!.at)).toBe("10/22 07:12");
    expect(formatPointTime(sameDay.points[1]!.at)).toBe("10/22 21:00");
  });

  it("formats tooltip values with the series decimals", () => {
    expect(formatPointValue(60, { unit: "kg", decimals: 1, points: [] })).toBe("60.0");
    expect(formatPointValue(4, { unit: "/5", decimals: 0, points: [] })).toBe("4");
  });
});
