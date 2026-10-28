import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("./use-photo-url", () => ({ usePhotoUrl: () => ({ status: "loading" }) }));

import { appDb } from "@/features/storage/app-db";
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
    expect(items).toHaveLength(7);
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

describe("photo history view", () => {
  async function renderHistory() {
    const { photoModule } = await import("./module");
    const View = photoModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
  }

  it("lists photo records newest first", async () => {
    await appDb.photoRecords.clear();
    const base = { date: "2026-10-20", photoIds: ["x"], updatedAt: "2026-10-20T08:00:00+09:00" };
    await appDb.photoRecords.bulkPut([
      { ...base, id: "old", recordedAt: "2026-10-20T08:00:00+09:00", note: "古いメモ" },
      { ...base, id: "new", recordedAt: "2026-10-27T08:00:00+09:00", note: "新しいメモ" },
    ]);
    await renderHistory();
    await waitFor(() => expect(screen.getByText("新しいメモ")).toBeTruthy());
    const text = document.body.textContent ?? "";
    expect(text.indexOf("新しいメモ")).toBeLessThan(text.indexOf("古いメモ"));
  });

  it("en: reads 1 photo for one photo and n photos otherwise", async () => {
    await appDb.photoRecords.clear();
    const base = { date: "2026-10-20", note: "", updatedAt: "2026-10-20T08:00:00+09:00" };
    await appDb.photoRecords.bulkPut([
      { ...base, id: "one", recordedAt: "2026-10-20T08:00:00+09:00", photoIds: ["x"] },
      { ...base, id: "two", recordedAt: "2026-10-21T08:00:00+09:00", photoIds: ["y", "z"] },
    ]);
    const { photoModule } = await import("./module");
    const View = photoModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "en" });
    await waitFor(() => expect(screen.getByText(/・2 photos$/)).toBeTruthy());
    expect(screen.getByText(/・1 photo$/)).toBeTruthy();
  });

  it("shows the empty text without records", async () => {
    await appDb.photoRecords.clear();
    await renderHistory();
    await waitFor(() => expect(screen.getByText("記録がありません")).toBeTruthy());
  });
});
