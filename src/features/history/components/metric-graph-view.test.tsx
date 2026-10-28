import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithLanguage } from "@/test/render-with-language";

import { MetricGraphView, type GraphMetric, type GraphSeries } from "./metric-graph-view";

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

const series = (values: number[], unit = "kg"): GraphSeries => ({
  unit,
  decimals: 1,
  points: values.map((value, index) => ({ at: `2026-03-2${index}T00:00:00+09:00`, value })),
});

const weightLoad = vi.fn();
const bodyFatLoad = vi.fn();
const metrics: GraphMetric[] = [
  { key: "weight", labelKey: "measurement_item_weight", load: weightLoad },
  { key: "bodyFat", labelKey: "measurement_item_body_fat", load: bodyFatLoad },
  { key: "bmi", labelKey: "history_graph_metric_bmi", load: vi.fn().mockResolvedValue(series([20.8], "")) },
];

const renderView = () => renderWithLanguage(<MetricGraphView metrics={metrics} />, { initialLanguage: "ja" });

beforeEach(() => {
  weightLoad.mockReset().mockResolvedValue(series([62.5, 62.1, 61.8]));
  bodyFatLoad.mockReset().mockResolvedValue(series([18.5], "%"));
});

describe("MetricGraphView", () => {
  it("lists the metrics in the selector and loads the first one for the last 7 days", async () => {
    renderView();
    const selector = screen.getByLabelText("表示する項目");
    expect(Array.from((selector as HTMLSelectElement).options).map((o) => o.textContent)).toEqual([
      "体重",
      "体脂肪率",
      "BMI",
    ]);
    await waitFor(() => expect(weightLoad).toHaveBeenCalledTimes(1));
    const range = weightLoad.mock.calls[0]![0] as { start: string; end: string };
    expect(range.start <= range.end).toBe(true);
  });

  it("renders the preset buttons and the chart when data exists", async () => {
    const { container } = renderView();
    expect(screen.getByRole("button", { name: "7日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全期間" })).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector(".history-screen__chart-wrapper")).toBeInTheDocument());
  });

  it("shows the empty state when there are no points", async () => {
    weightLoad.mockResolvedValue(series([]));
    renderView();
    expect(await screen.findByText("選択した範囲に利用可能なデータがありません。")).toBeInTheDocument();
  });

  it("shows a loading message while the series loads", async () => {
    weightLoad.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(await screen.findByText("読み込み中…")).toBeInTheDocument();
  });

  it("loads the chosen metric when the selector changes", async () => {
    const user = userEvent.setup();
    renderView();
    await waitFor(() => expect(weightLoad).toHaveBeenCalled());
    const selector = screen.getByLabelText("表示する項目");
    await user.selectOptions(selector, within(selector).getByRole("option", { name: "体脂肪率" }));
    await waitFor(() => expect(bodyFatLoad).toHaveBeenCalled());
  });

  it("reloads with a wider range when a preset is pressed", async () => {
    const user = userEvent.setup();
    renderView();
    await waitFor(() => expect(weightLoad).toHaveBeenCalledTimes(1));
    const first = weightLoad.mock.calls[0]![0] as { start: string };
    await user.click(screen.getByRole("button", { name: "30日" }));
    await waitFor(() => expect(weightLoad).toHaveBeenCalledTimes(2));
    const second = weightLoad.mock.calls[1]![0] as { start: string };
    expect(second.start < first.start).toBe(true);
  });
});
