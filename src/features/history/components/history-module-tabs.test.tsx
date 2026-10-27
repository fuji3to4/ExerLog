import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { bodyModule } from "@/features/modules/body/module";
import { circumferenceModule } from "@/features/modules/circumference/module";
import { wellnessModule } from "@/features/modules/wellness/module";
import type { RecordModule } from "@/features/modules/types";
import { renderWithLanguage } from "@/test/render-with-language";

import { HistoryModuleTabs } from "./history-module-tabs";

function withView(module: unknown, text: string): RecordModule {
  return { ...(module as RecordModule), HistoryView: () => <p>{text}</p> };
}

const wellness = withView(wellnessModule, "体調の見返し");
const body = withView(bodyModule, "身体の見返し");
const circumference = withView(circumferenceModule, "周径の見返し");

describe("HistoryModuleTabs", () => {
  it("lists すべて first, then the modules in the given order", () => {
    renderWithLanguage(
      <HistoryModuleTabs modules={[wellness, body, circumference]} includeAll allContent={<p>まとめの中身</p>} />,
      { initialLanguage: "ja" },
    );
    const tabs = within(screen.getByRole("tablist", { name: "表示する記録" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["すべて", "体調", "身体", "周径"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("まとめの中身")).toBeInTheDocument();
  });

  it("shows the module's history view when its chip is pressed", async () => {
    const user = userEvent.setup();
    renderWithLanguage(
      <HistoryModuleTabs modules={[wellness, body, circumference]} includeAll allContent={<p>まとめの中身</p>} />,
      { initialLanguage: "ja" },
    );
    await user.click(screen.getByRole("tab", { name: "周径" }));
    expect(screen.getByText("周径の見返し")).toBeInTheDocument();
    expect(screen.queryByText("まとめの中身")).toBeNull();
  });

  it("falls back to すべて when the selected module is removed", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithLanguage(
      <HistoryModuleTabs modules={[wellness, body, circumference]} includeAll allContent={<p>まとめの中身</p>} />,
      { initialLanguage: "ja" },
    );
    await user.click(screen.getByRole("tab", { name: "周径" }));
    rerender(<HistoryModuleTabs modules={[wellness, body]} includeAll allContent={<p>まとめの中身</p>} />);
    expect(screen.getByRole("tab", { name: "すべて" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "周径" })).toBeNull();
    expect(screen.getByText("まとめの中身")).toBeInTheDocument();
  });

  it("without すべて, starts on the first module and falls back to it", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithLanguage(
      <HistoryModuleTabs modules={[wellness, body, circumference]} includeAll={false} />,
      { initialLanguage: "ja" },
    );
    expect(screen.queryByRole("tab", { name: "すべて" })).toBeNull();
    expect(screen.getByText("体調の見返し")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "周径" }));
    rerender(<HistoryModuleTabs modules={[wellness, body]} includeAll={false} />);
    expect(screen.getByRole("tab", { name: "体調" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("体調の見返し")).toBeInTheDocument();
  });
});
