import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ja } from "@/features/i18n/messages/ja";
import type { Messages } from "@/features/i18n/messages";
import { renderWithLanguage } from "@/test/render-with-language";
import { buildCircumferenceSeries } from "@/features/history/history-graph-query";
import { CircumferenceGraph, SquareDot, circumferenceTooltipLines } from "./circumference-graph";

vi.mock("@/features/history/history-graph-query", () => ({
  buildCircumferenceSeries: vi.fn().mockResolvedValue([
    { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 0.3 } },
    { at: "2026-10-21T07:10:00+09:00", left: { value: 22.5, delta: 0.1 } },
  ]),
}));

// Give the chart a fixed size in jsdom so Recharts renders lines and the legend.
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: (props: any) => <original.LineChart {...props} width={800} height={400} />,
  };
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as any;

function t(key: keyof Messages, replacements?: Record<string, string | number>): string {
  let message: string = ja[key];
  for (const [placeholder, value] of Object.entries(replacements ?? {})) {
    message = message.replaceAll(`{${placeholder}}`, String(value));
  }
  return message;
}

describe("circumferenceTooltipLines", () => {
  it("lists time, right, left, then the left/right difference", () => {
    expect(
      circumferenceTooltipLines(
        { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 0.3 } },
        t,
      ),
    ).toEqual(["10/20 07:10", "右 24.5cm（前回 +0.3）", "左 22.4cm", "左右差 2.1（右が大きい）"]);
  });

  it("has no difference line when only the left side was recorded", () => {
    expect(
      circumferenceTooltipLines({ at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: -0.2 } }, t),
    ).toEqual(["10/20 07:10", "左 22.4cm（前回 −0.2）"]);
  });

  it("shows an equal difference without naming a side", () => {
    expect(
      circumferenceTooltipLines(
        { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 22.4, delta: null } },
        t,
      ),
    ).toEqual(["10/20 07:10", "右 22.4cm", "左 22.4cm", "左右差 0.0"]);
  });
});

describe("SquareDot", () => {
  it("draws nothing for a point without a value (Recharts passes cy: null)", () => {
    const { container } = render(
      <svg>
        <SquareDot cx={10} cy={null} fill="red" size={6} />
      </svg>,
    );
    expect(container.querySelector("rect")).toBeNull();
  });

  it("draws a square centered on the point", () => {
    const { container } = render(
      <svg>
        <SquareDot cx={10} cy={20} fill="red" size={6} />
      </svg>,
    );
    const rect = container.querySelector("rect")!;
    expect([rect.getAttribute("x"), rect.getAttribute("y"), rect.getAttribute("width")]).toEqual(["7", "17", "6"]);
  });
});

describe("CircumferenceGraph", () => {
  it("lists the legend left first, then right", async () => {
    const { container } = renderWithLanguage(
      <CircumferenceGraph range={{ start: "2026-10-01", end: "2026-10-31" }} />,
      { initialLanguage: "ja" },
    );
    await screen.findAllByText("左");
    const legend = Array.from(container.querySelectorAll(".recharts-legend-item-text")).map((el) => el.textContent);
    expect(legend).toEqual(["左", "右"]);
  });

  it("draws one right-side square per right reading only", async () => {
    const { container } = renderWithLanguage(
      <CircumferenceGraph range={{ start: "2026-10-01", end: "2026-10-31" }} />,
      { initialLanguage: "ja" },
    );
    await screen.findAllByText("左");
    // The second point is left-only, so only the first point gets a square dot.
    expect(container.querySelectorAll(".recharts-line-dots rect")).toHaveLength(1);
  });

  it("groups the site buttons under an accessible name", async () => {
    renderWithLanguage(<CircumferenceGraph range={{ start: "2026-10-01", end: "2026-10-31" }} />, {
      initialLanguage: "ja",
    });
    await screen.findAllByText("左");
    const group = screen.getByRole("group", { name: "部位" });
    expect(within(group).getByRole("button", { name: "手首" })).toBeTruthy();
  });

  it("shows the empty state instead of stale points when the query fails", async () => {
    const { container } = renderWithLanguage(
      <CircumferenceGraph range={{ start: "2026-10-01", end: "2026-10-31" }} />,
      { initialLanguage: "ja" },
    );
    await screen.findAllByText("左");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(buildCircumferenceSeries).mockRejectedValueOnce(new Error("db failed"));

    fireEvent.click(screen.getByRole("button", { name: "手首" }));

    expect(await screen.findByText(ja.history_graphs_empty)).toBeTruthy();
    expect(container.querySelector(".recharts-line")).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
