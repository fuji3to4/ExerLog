import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
const downloadMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/download", () => ({ downloadTextFile: downloadMock }));

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { SAMPLE_DEFINITION } from "../custom/ai-guide";
import { loadCustomTypes, saveImportedDefinition } from "../custom/type-store";
import { useModuleSettings } from "../use-module-settings";
import { AddRecordMenu } from "./add-record-menu";
import { ModuleSettingsSection } from "./module-settings-section";

function Harness() {
  const { enabledModules } = useModuleSettings();
  return (
    <>
      <ModuleSettingsSection />
      <AddRecordMenu modules={enabledModules} onChoose={() => {}} />
    </>
  );
}

function rows() {
  return screen.getAllByTestId("module-row");
}
function offRows() {
  return screen.queryAllByTestId("off-module-row");
}
const nameOf = (r: HTMLElement) => within(r).getByRole("switch").getAttribute("aria-label");
function rowNames() {
  return rows().map(nameOf);
}
function offRowNames() {
  return offRows().map(nameOf);
}
function row(name: string) {
  return [...rows(), ...offRows()].find((r) => nameOf(r) === name)!;
}

describe("ModuleSettingsSection", () => {
  beforeEach(() => {
    window.localStorage.removeItem("lymly-record-modules");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lists ON modules and folds the OFF ones away", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    expect(rowNames()).toEqual(["体調", "身体", "胸囲・腹囲", "腕・脚周径", "写真"]);
    for (const r of rows()) {
      expect(within(r).getByRole("switch").getAttribute("aria-checked")).toBe("true");
      expect(within(r).getByLabelText("並べ替え")).toBeTruthy();
    }
    expect(screen.getByText("非表示の項目（3）")).toBeTruthy();
    expect(offRowNames()).toEqual(["セルフケア", "着用", "症状"]);
    for (const r of offRows()) {
      expect(within(r).getByRole("switch").getAttribute("aria-checked")).toBe("false");
      expect(within(r).queryByLabelText("並べ替え")).toBeNull();
      expect(within(r).queryByRole("button", { name: "上へ" })).toBeNull();
    }
    expect(screen.getByText("この順に「＋記録する」や履歴に並びます")).toBeTruthy();
  });

  it("shows no OFF section when every module is ON", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
    for (const r of rows()) expect(within(r).getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(rows()).toHaveLength(8);
    expect(screen.queryByText(/非表示の項目/)).toBeNull();
  });

  it("shows the lymphedema tag next to the tagged modules only", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
    const tagged = rows().filter((r) => within(r).queryByText("リンパ浮腫")).map(nameOf);
    expect(tagged).toEqual(["セルフケア", "着用", "症状"]);
  });

  it("moves a module up with the button and stores the order", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    for (let i = 0; i < 3; i++) fireEvent.click(within(row("腕・脚周径")).getByRole("button", { name: "上へ" }));

    expect(rowNames()).toEqual(["腕・脚周径", "体調", "身体", "胸囲・腹囲", "写真", "セルフケア", "着用", "症状"]);
    const stored = JSON.parse(window.localStorage.getItem("lymly-record-modules")!);
    expect(stored.order).toEqual(["circumference", "wellness", "body", "girth", "photo", "selfcare", "compression", "symptoms"]);
  });

  it("moves past OFF modules, which keep their place", () => {
    window.localStorage.setItem(
      "lymly-record-modules",
      JSON.stringify({
        order: ["wellness", "body", "girth", "circumference", "photo", "selfcare", "compression", "symptoms"],
        disabled: ["body", "girth"],
      }),
    );
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    fireEvent.click(within(row("腕・脚周径")).getByRole("button", { name: "上へ" }));

    expect(rowNames()).toEqual(["腕・脚周径", "体調", "写真", "セルフケア", "着用", "症状"]);
    expect(offRowNames()).toEqual(["身体", "胸囲・腹囲"]);
  });

  it("disables the first row's up button and the last row's down button", () => {
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    const all = rows();
    expect((within(all[0]).getByRole("button", { name: "上へ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(all[all.length - 1]).getByRole("button", { name: "下へ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(all[0]).getByRole("button", { name: "下へ" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("turning a module OFF moves it into the OFF section and out of the add menu", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    fireEvent.click(within(row("身体")).getByRole("switch"));

    const stored = JSON.parse(window.localStorage.getItem("lymly-record-modules")!);
    expect(stored.disabled).toEqual(["body"]);
    expect(rowNames()).not.toContain("身体");
    expect(offRowNames()).toEqual(["身体"]);
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["体調", "胸囲・腹囲", "腕・脚周径", "写真", "セルフケア", "着用", "症状"]);
  });

  it("turning a module back ON puts it at the end of the ON list", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    fireEvent.click(within(row("体調")).getByRole("switch"));
    expect(offRowNames()).toEqual(["体調", "セルフケア", "着用", "症状"]);
    fireEvent.click(within(row("体調")).getByRole("switch"));

    expect(rowNames()).toEqual(["身体", "胸囲・腹囲", "腕・脚周径", "写真", "体調"]);
    expect(offRowNames()).toEqual(["セルフケア", "着用", "症状"]);
  });

  it("appends girth enabled for a device with saved settings", () => {
    window.localStorage.setItem(
      "lymly-record-modules",
      JSON.stringify({
        order: ["wellness", "body", "circumference", "photo", "selfcare", "compression", "symptoms"],
        disabled: ["photo"],
      }),
    );
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    expect(rowNames()).toEqual(["体調", "身体", "腕・脚周径", "セルフケア", "着用", "症状", "胸囲・腹囲"]);
    expect(offRowNames()).toEqual(["写真"]);
  });

  describe("custom rows", () => {
    beforeEach(async () => {
      await appDb.customRecordTypes.clear();
      await loadCustomTypes();
      await saveImportedDefinition(SAMPLE_DEFINITION);
    });

    it("badges a custom row and deletes it from the menu after confirming", async () => {
      renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

      expect(within(row("プロテイン")).getByText("カスタム")).toBeTruthy();
      fireEvent.keyDown(within(row("プロテイン")).getByRole("button", { name: "「プロテイン」の操作" }), { key: "Enter" });
      fireEvent.click(screen.getByRole("menuitem", { name: "定義を削除" }));
      expect(screen.getByText("記録は消えません。同じ定義を読み込むと元に戻ります")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "削除する" }));

      await waitFor(() => expect(rowNames()).not.toContain("プロテイン"));
    });
  });

  describe("built-in templates", () => {
    it("exports wellness as a definition, without a delete item", () => {
      downloadMock.mockClear();
      renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

      fireEvent.keyDown(within(row("体調")).getByRole("button", { name: "「体調」の操作" }), { key: "Enter" });
      expect(screen.queryByRole("menuitem", { name: "定義を削除" })).toBeNull();
      fireEvent.click(screen.getByRole("menuitem", { name: "定義を書き出す" }));

      expect(downloadMock).toHaveBeenCalledTimes(1);
      const [fileName, content, mime] = downloadMock.mock.calls[0];
      expect(fileName).toBe("exerlog-wellness.json");
      expect(mime).toBe("application/json");
      expect(JSON.parse(content).fields.map((f: { id: string }) => f.id)).toEqual(["physical", "mental"]);
    });

    it("gives modules without a template no menu", () => {
      renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
      expect(within(row("身体")).queryByRole("button", { name: "「身体」の操作" })).toBeNull();
    });
  });
});
