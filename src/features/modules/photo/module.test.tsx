import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { AddRecordMenu } from "@/features/modules/components/add-record-menu";
import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { RECORD_MODULES } from "@/features/modules/registry";
import { renderWithLanguage } from "@/test/render-with-language";

describe("photo module registration", () => {
  it("the add menu lists 写真 as the 4th module and opens 写真を記録", () => {
    const chosen: { current?: (typeof RECORD_MODULES)[number] } = {};
    renderWithLanguage(<AddRecordMenu modules={RECORD_MODULES} onChoose={(m) => (chosen.current = m)} />, {
      initialLanguage: "ja",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(4);
    expect(items[3].textContent).toBe("写真");
    fireEvent.click(items[3]);
    expect(chosen.current?.data.id).toBe("photo");

    renderWithLanguage(
      <ModuleRecordDialog module={chosen.current!} open onOpenChange={vi.fn()} date="2026-10-20" onSaved={vi.fn()} />,
      { initialLanguage: "ja" },
    );
    expect(screen.getByText("写真を記録")).toBeTruthy();
  });
});
