import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { renderWithLanguage } from "@/test/render-with-language";
import { getRecordModule } from "../registry";
import type { RecordModule } from "../types";
import { AddRecordMenu } from "./add-record-menu";

function renderMenu(modules: readonly RecordModule[]) {
  const onChoose = vi.fn();
  renderWithLanguage(<AddRecordMenu modules={modules} onChoose={onChoose} />, { initialLanguage: "ja" });
  return { onChoose };
}

function openMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
}

describe("AddRecordMenu", () => {
  it("drops down an item per module in the given order", () => {
    renderMenu([getRecordModule("circumference")!, getRecordModule("wellness")!]);
    expect(screen.queryByRole("menu")).toBeNull();

    openMenu();

    const menu = screen.getByRole("menu");
    expect(menu).toHaveTextContent("何を記録しますか？");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["腕・脚周径", "体調"]);
  });

  it("closes and reports the chosen module", () => {
    const circumference = getRecordModule("circumference")!;
    const { onChoose } = renderMenu([circumference, getRecordModule("wellness")!]);

    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "腕・脚周径" }));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(circumference);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("points to the settings when no module is on", () => {
    renderMenu([]);

    openMenu();

    expect(screen.getByText("設定で記録する項目をONにしてください")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "設定を開く" }).getAttribute("href")).toBe("/settings");
  });
});
