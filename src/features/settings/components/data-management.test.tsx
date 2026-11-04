import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { renderWithLanguage } from "@/test/render-with-language";
import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { DataManagement } from "./data-management";

describe("DataManagement history export", () => {
  it("shows one export button whose drop-down lists every history CSV", async () => {
    renderWithLanguage(<DataManagement />, { initialLanguage: "ja" });

    const trigger = screen.getByRole("button", { name: "履歴をエクスポート（CSV）" });
    expect(screen.queryByRole("button", { name: "運動ログ" })).toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["運動ログ", "動画の視聴履歴", "体調", "身体", "胸囲・腹囲", "腕・脚周径", "写真", "セルフケア", "着用", "症状"]);
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

describe("DataManagement starter exercises", () => {
  beforeEach(async () => {
    await appDb.exercises.clear();
  });

  it("imports the starter exercises from the library section", async () => {
    renderWithLanguage(<DataManagement />, { initialLanguage: "ja" });

    fireEvent.click(screen.getByRole("button", { name: "初期データをインポート" }));

    expect(
      await screen.findByText(`初期データから${exerciseCatalog.length}件のエクササイズを追加しました。`),
    ).toBeInTheDocument();
    expect(await appDb.exercises.count()).toBe(exerciseCatalog.length);
  });

  it("says so when every starter exercise is already registered", async () => {
    renderWithLanguage(<DataManagement />, { initialLanguage: "ja" });
    const button = screen.getByRole("button", { name: "初期データをインポート" });

    fireEvent.click(button);
    await screen.findByText(/初期データから/);
    fireEvent.click(button);

    expect(await screen.findByText("初期データはすべて登録済みです。")).toBeInTheDocument();
  });
});
