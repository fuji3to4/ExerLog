import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { buildAiGuide, SAMPLE_DEFINITION } from "../ai-guide";
import { resolveText } from "../definition";
import { loadCustomTypes, markTypeDeleted, saveImportedDefinition } from "../type-store";
import { CustomTypesSettings } from "./custom-types-settings";

describe("CustomTypesSettings", () => {
  beforeEach(async () => {
    await Promise.all([appDb.customRecordTypes.clear(), appDb.customRecords.clear(), appDb.tombstones.clear()]);
    await loadCustomTypes();
    vi.unstubAllGlobals();
  });

  it("copies the AI guide for the current language", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(screen.getByRole("button", { name: "AI に渡す説明をコピー" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(buildAiGuide("ja")));
    expect(await screen.findByText("コピーしました")).toBeTruthy();
  });

  it("shows the guide in a selected textarea when the clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(screen.getByRole("button", { name: "AI に渡す説明をコピー" }));

    const area = (await screen.findByRole("textbox")) as HTMLTextAreaElement;
    expect(area.readOnly).toBe(true);
    expect(area.value).toBe(buildAiGuide("ja"));
  });

  it("lists deleted definitions and restores one", async () => {
    await saveImportedDefinition(SAMPLE_DEFINITION);
    await markTypeDeleted("protein", true);
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByText("削除した定義（記録あり）"));
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));

    await waitFor(async () => expect((await appDb.customRecordTypes.get("protein"))?.deleted).toBe(false));
  });

  it("hides the deleted section when nothing is deleted", () => {
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });
    expect(screen.queryByText("削除した定義（記録あり）")).toBeNull();
  });

  it("shows a message when restoring fails", async () => {
    await saveImportedDefinition(SAMPLE_DEFINITION);
    await markTypeDeleted("protein", true);
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByText("削除した定義（記録あり）"));
    const put = vi.spyOn(appDb.customRecordTypes, "put").mockRejectedValueOnce(new Error("quota"));
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));

    expect(await screen.findByText("保存できませんでした。もう一度お試しください")).toBeTruthy();
    put.mockRestore();
  });

  async function deletedProteinWithRecords() {
    await saveImportedDefinition(SAMPLE_DEFINITION);
    await appDb.customRecords.bulkAdd(
      ["a", "b"].map((id) => ({
        id,
        typeId: "protein",
        date: "2026-11-01",
        recordedAt: "2026-11-01T08:00:00+09:00",
        values: {},
        note: "",
        updatedAt: "2026-11-01T08:00:00+09:00",
      })),
    );
    await markTypeDeleted("protein", true);
  }

  it("permanently deletes a deleted definition and its records after confirming", async () => {
    await deletedProteinWithRecords();
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByText("削除した定義（記録あり）"));
    fireEvent.click(screen.getByRole("button", { name: "完全に削除" }));

    expect(
      await screen.findByText(`${resolveText(SAMPLE_DEFINITION.name, "ja")}の定義と記録2件を完全に削除します。元に戻せません`),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(screen.queryByText("削除した定義（記録あり）")).toBeNull());
    expect(await appDb.customRecordTypes.get("protein")).toBeUndefined();
    expect(await appDb.customRecords.count()).toBe(0);
  });

  it("keeps everything when the permanent delete is cancelled", async () => {
    await deletedProteinWithRecords();
    renderWithLanguage(<CustomTypesSettings />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByText("削除した定義（記録あり）"));
    fireEvent.click(screen.getByRole("button", { name: "完全に削除" }));
    await screen.findByText(/完全に削除します/);
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByText(/完全に削除します/)).toBeNull();
    expect(screen.getByRole("button", { name: "元に戻す" })).toBeTruthy();
    expect(await appDb.customRecordTypes.get("protein")).toBeDefined();
    expect(await appDb.customRecords.count()).toBe(2);
  });
});
