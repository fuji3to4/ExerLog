import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { renderWithLanguage } from "@/test/render-with-language";
import { DataManagement } from "./data-management";

describe("DataManagement history export", () => {
  it("shows one export button whose drop-down lists every history CSV", async () => {
    renderWithLanguage(<DataManagement />, { initialLanguage: "ja" });

    const trigger = screen.getByRole("button", { name: "履歴をエクスポート（CSV）" });
    expect(screen.queryByRole("button", { name: "運動ログ" })).toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["運動ログ", "動画の視聴履歴", "体調", "身体", "腕・脚周径", "写真", "セルフケア", "着用", "症状"]);
  });

  it("downloads the chosen CSV", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderWithLanguage(<DataManagement />, { initialLanguage: "ja" });

    fireEvent.keyDown(screen.getByRole("button", { name: "履歴をエクスポート（CSV）" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "身体" }));

    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });
});
