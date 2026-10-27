import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { renderWithLanguage } from "@/test/render-with-language";
import { getRecordModule } from "../registry";
import type { RecordModule } from "../types";
import { AddRecordSheet } from "./add-record-sheet";

function renderSheet(modules: readonly RecordModule[]) {
  const onChoose = vi.fn();
  const onOpenChange = vi.fn();
  renderWithLanguage(
    <AddRecordSheet open onOpenChange={onOpenChange} modules={modules} onChoose={onChoose} />,
    { initialLanguage: "ja" },
  );
  return { onChoose, onOpenChange };
}

describe("AddRecordSheet", () => {
  it("shows a tile per module in the given order under the title", () => {
    renderSheet([getRecordModule("circumference")!, getRecordModule("wellness")!]);

    const sheet = screen.getByRole("dialog", { name: "何を記録しますか？" });
    const tiles = within(within(sheet).getByRole("list")).getAllByRole("button");
    expect(tiles.map((tile) => tile.textContent)).toEqual(["周径", "体調"]);
  });

  it("closes and reports the chosen module", () => {
    const circumference = getRecordModule("circumference")!;
    const { onChoose, onOpenChange } = renderSheet([circumference, getRecordModule("wellness")!]);

    fireEvent.click(screen.getByRole("button", { name: "周径" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(circumference);
  });

  it("points to the settings when no module is on", () => {
    renderSheet([]);

    expect(screen.getByText("設定で記録する項目をONにしてください")).toBeTruthy();
    expect(screen.getByRole("link", { name: "設定を開く" }).getAttribute("href")).toBe("/settings");
    expect(screen.queryByRole("list")).toBeNull();
  });
});
