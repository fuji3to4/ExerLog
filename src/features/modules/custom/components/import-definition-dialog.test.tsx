import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { ja } from "@/features/i18n/messages/ja";
import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { SAMPLE_DEFINITION } from "../ai-guide";
import { getCustomTypes, loadCustomTypes, saveImportedDefinition } from "../type-store";
import { ImportDefinitionDialog } from "./import-definition-dialog";

function openAndPaste(text: string) {
  renderWithLanguage(<ImportDefinitionDialog open onOpenChange={() => {}} />, { initialLanguage: "ja" });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "確認" }));
}

describe("ImportDefinitionDialog", () => {
  beforeEach(async () => {
    await appDb.customRecordTypes.clear();
    await loadCustomTypes();
  });

  it("previews a new definition and saves it on 読み込む", async () => {
    openAndPaste(JSON.stringify(SAMPLE_DEFINITION));

    expect(await screen.findByText("新規")).toBeTruthy();
    expect(screen.getByText("🥤 プロテイン")).toBeTruthy();
    for (const name of ["量", "種類", "タイミング", "空腹時", "銘柄", "おいしさ"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "読み込む" }));
    await waitFor(() => expect(getCustomTypes().map((t) => t.id)).toEqual(["protein"]));
  });

  it("lists every error and offers no 読み込む", async () => {
    openAndPaste('{"id":"Bad!"}');

    expect(await screen.findByText(ja.custom_def_error_bad_id.replace("{path}", "id"))).toBeTruthy();
    expect(screen.getByText(ja.custom_def_error_no_fields.replace("{path}", "fields"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: "読み込む" })).toBeNull();
    expect(screen.getByRole("button", { name: "エラーをコピー" })).toBeTruthy();
  });

  it("marks an update and the fields that become hidden", async () => {
    await saveImportedDefinition(SAMPLE_DEFINITION);
    const next = { ...SAMPLE_DEFINITION, fields: SAMPLE_DEFINITION.fields.filter((f) => f.id !== "brand") };
    openAndPaste(JSON.stringify(next));

    expect(await screen.findByText("更新")).toBeTruthy();
    const row = screen.getByText("銘柄").closest("li")!;
    expect(row.textContent).toContain("非表示（データは残ります）");
    expect(screen.getByText("量").closest("li")!.textContent).not.toContain("非表示");
  });

  it("rejects a changed field type", async () => {
    await saveImportedDefinition(SAMPLE_DEFINITION);
    const next = {
      ...SAMPLE_DEFINITION,
      fields: SAMPLE_DEFINITION.fields.map((f) => (f.id === "amount" ? { id: "amount", label: "量", type: "text" } : f)),
    };
    openAndPaste(JSON.stringify(next));

    expect(await screen.findByText(ja.custom_def_error_type_changed.replace("{path}", "fields.amount"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: "読み込む" })).toBeNull();
  });

  it("clears the file input so the same file can be picked again", async () => {
    renderWithLanguage(<ImportDefinitionDialog open onOpenChange={() => {}} />, { initialLanguage: "ja" });
    const input = screen.getByLabelText("ファイルを選ぶ") as HTMLInputElement;
    // jsdom cannot set a file input's value; track what the handler writes instead.
    let current = "protein.json";
    const setValue = vi.fn((next: string) => {
      current = next;
    });
    Object.defineProperty(input, "value", { configurable: true, get: () => current, set: setValue });
    const json = JSON.stringify(SAMPLE_DEFINITION);
    const file = new File([json], "protein.json", { type: "application/json" });
    // jsdom's File has no text().
    Object.assign(file, { text: () => Promise.resolve(json) });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("protein"));
    expect(setValue).toHaveBeenCalledWith("");
  });

  it("shows a message when saving fails", async () => {
    openAndPaste(JSON.stringify(SAMPLE_DEFINITION));
    expect(await screen.findByText("新規")).toBeTruthy();
    const put = vi.spyOn(appDb.customRecordTypes, "put").mockRejectedValueOnce(new Error("quota"));
    fireEvent.click(screen.getByRole("button", { name: "読み込む" }));
    expect(await screen.findByText(ja.custom_save_failed)).toBeTruthy();
    put.mockRestore();
  });

  it("shows a message when checking fails", async () => {
    const get = vi.spyOn(appDb.customRecordTypes, "get").mockRejectedValueOnce(new Error("closed"));
    openAndPaste(JSON.stringify(SAMPLE_DEFINITION));
    expect(await screen.findByText(ja.custom_save_failed)).toBeTruthy();
    get.mockRestore();
  });
});
