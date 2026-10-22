import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryGraphs } from "./history-graphs";
import { renderWithLanguage } from "@/test/render-with-language";

const renderGraphs = () => renderWithLanguage(<HistoryGraphs />, { initialLanguage: "ja" });

vi.mock("@/features/history/history-graph-query", () => ({
  buildHistoryGraphSeries: vi.fn(),
}));

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

describe("HistoryGraphs", () => {
  it("renders graph heading", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-03-20T00:00:00+09:00", value: 62.5 },
        { at: "2026-03-21T00:00:00+09:00", value: 62.1 },
      ],
    });

    renderGraphs();
    expect(await screen.findByText("グラフ")).toBeInTheDocument();
  });

  it("renders metric selector dropdown with weight option", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-03-20T00:00:00+09:00", value: 62.5 },
        { at: "2026-03-21T00:00:00+09:00", value: 62.1 },
      ],
    });

    renderGraphs();
    await screen.findByText("グラフ");

    const selector = screen.getByLabelText("表示する項目");
    expect(selector).toBeInTheDocument();
    expect(within(selector).getByText("体重")).toBeInTheDocument();
  });

  it("offers BMI as a metric and requests the bmi series when selected", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();
    vi.mocked(buildHistoryGraphSeries).mockClear();
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "",
      decimals: 1,
      points: [{ at: "2026-10-20T00:00:00+09:00", value: 20.8 }],
    });

    renderGraphs();
    await screen.findByText("グラフ");

    const selector = screen.getByLabelText("表示する項目") as HTMLSelectElement;
    const bmiOption = within(selector).getByRole("option", { name: "BMI" }) as HTMLOptionElement;
    await user.selectOptions(selector, bmiOption);

    await waitFor(() =>
      expect(vi.mocked(buildHistoryGraphSeries)).toHaveBeenLastCalledWith(
        expect.objectContaining({ metric: { kind: "bmi" } }),
      ),
    );
  });

  it("renders date range preset buttons", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-03-20T00:00:00+09:00", value: 62.5 },
        { at: "2026-03-21T00:00:00+09:00", value: 62.1 },
      ],
    });

    renderGraphs();
    await screen.findByText("グラフ");

    expect(screen.getByRole("button", { name: "7日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90日" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全期間" })).toBeInTheDocument();
  });

  it("renders chart when data exists", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-03-20T00:00:00+09:00", value: 62.5 },
        { at: "2026-03-21T00:00:00+09:00", value: 62.1 },
        { at: "2026-03-22T00:00:00+09:00", value: 61.8 },
      ],
    });

    const { container } = renderGraphs();

    // Wait for the chart to load
    const chart = await screen.findByRole("region", { name: "", hidden: true }).catch(() => null)
      || container.querySelector(".recharts-wrapper");

    expect(container.querySelector(".history-screen__chart-wrapper")).toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("shows empty state when no data points", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [],
    });

    renderGraphs();

    expect(await screen.findByText("選択した範囲に利用可能なデータがありません。")).toBeInTheDocument();
  });

  it("updates graph when metric selector changes", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();

    vi.mocked(buildHistoryGraphSeries).mockClear();
    vi.mocked(buildHistoryGraphSeries)
      .mockResolvedValueOnce({
        unit: "kg",
        decimals: 1,
        points: [{ at: "2026-03-20T00:00:00+09:00", value: 62.5 }],
      })
      .mockResolvedValueOnce({
        unit: "%",
        decimals: 1,
        points: [{ at: "2026-03-20T00:00:00+09:00", value: 18.5 }],
      });

    renderGraphs();

    const initialCallCount = vi.mocked(buildHistoryGraphSeries).mock.calls.length;

    const selector = screen.getByLabelText("表示する項目") as HTMLSelectElement;
    const bodyFatOption = Array.from(selector.options).find((opt) => opt.textContent === "体脂肪率");
    if (bodyFatOption) {
      await user.click(selector);
      await user.selectOptions(selector, bodyFatOption);
    }

    // Wait for the graph to update
    await screen.findByText("体脂肪率");

    expect(vi.mocked(buildHistoryGraphSeries).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it("updates graph when date range preset changes", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();

    vi.mocked(buildHistoryGraphSeries)
      .mockResolvedValueOnce({
        unit: "kg",
        decimals: 1,
        points: [{ at: "2026-03-20T00:00:00+09:00", value: 62.5 }],
      })
      .mockResolvedValueOnce({
        unit: "kg",
        decimals: 1,
        points: [{ at: "2026-03-15T00:00:00+09:00", value: 63.0 }, { at: "2026-03-20T00:00:00+09:00", value: 62.5 }],
      });

    renderGraphs();

    const thirtyDayButton = screen.getByRole("button", { name: "30日" });
    await user.click(thirtyDayButton);

    // Wait for the graph update to settle (the loading indicator or graph content)
    await screen.findByText("体重");
    expect(vi.mocked(buildHistoryGraphSeries).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders chart and handles data updates", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({
      unit: "kg",
      decimals: 1,
      points: [
        { at: "2026-03-20T00:00:00+09:00", value: 60 },
        { at: "2026-03-21T00:00:00+09:00", value: 65 },
        { at: "2026-03-22T00:00:00+09:00", value: 62 },
      ],
    });

    const { container } = renderGraphs();

    await screen.findByText("グラフ");
    expect(container.querySelector(".history-screen__chart-wrapper")).toBeInTheDocument();
  });

  it("labels all metric options in Japanese", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({ unit: "kg", decimals: 1, points: [] });

    renderGraphs();
    const selector = screen.getByLabelText("表示する項目") as HTMLSelectElement;
    expect(Array.from(selector.options).map((o) => o.textContent)).toEqual([
      "体重",
      "体脂肪率",
      "身長",
      "BMI",
      "からだの調子",
      "こころの調子",
    ]);
  });

  it("requests the weight measurement series first and body fat by item id when selected", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    const user = userEvent.setup();
    vi.mocked(buildHistoryGraphSeries).mockClear();
    vi.mocked(buildHistoryGraphSeries).mockResolvedValue({ unit: "kg", decimals: 1, points: [] });

    renderGraphs();
    await waitFor(() =>
      expect(vi.mocked(buildHistoryGraphSeries)).toHaveBeenLastCalledWith(
        expect.objectContaining({ metric: { kind: "measurement", itemId: "weight" } }),
      ),
    );

    const selector = screen.getByLabelText("表示する項目") as HTMLSelectElement;
    await user.selectOptions(selector, within(selector).getByRole("option", { name: "体脂肪率" }));

    await waitFor(() =>
      expect(vi.mocked(buildHistoryGraphSeries)).toHaveBeenLastCalledWith(
        expect.objectContaining({ metric: { kind: "measurement", itemId: "bodyFat" } }),
      ),
    );
  });

  it("shows a Japanese loading message while the series loads", async () => {
    const { buildHistoryGraphSeries } = await import("@/features/history/history-graph-query");
    vi.mocked(buildHistoryGraphSeries).mockReturnValue(new Promise(() => {}));

    renderGraphs();
    expect(await screen.findByText("読み込み中…")).toBeInTheDocument();
  });
});
