import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { renderWithLanguage } from "@/test/render-with-language";
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
function rowNames() {
  return rows().map((r) => within(r).getByRole("switch").getAttribute("aria-label"));
}
function row(name: string) {
  return rows().find((r) => within(r).getByRole("switch").getAttribute("aria-label") === name)!;
}

describe("ModuleSettingsSection", () => {
  beforeEach(() => {
    window.localStorage.removeItem("lymly-record-modules");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("starts tagged modules OFF when no tag is enabled at build time", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    expect(rowNames()).toEqual(["体調", "身体", "周径", "写真", "セルフケア", "着用", "症状"]);
    const checked = rows().map((r) => within(r).getByRole("switch").getAttribute("aria-checked"));
    expect(checked).toEqual(["true", "true", "true", "true", "false", "false", "false"]);
    for (const r of rows()) expect(within(r).getByLabelText("並べ替え")).toBeTruthy();
    expect(screen.getByText("この順に「＋記録する」や履歴に並びます")).toBeTruthy();
  });

  it("starts every module ON when lymphedema is enabled at build time", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
    for (const r of rows()) expect(within(r).getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("shows the lymphedema tag next to the tagged modules only", () => {
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
    const tagged = rows()
      .filter((r) => within(r).queryByText("リンパ浮腫"))
      .map((r) => within(r).getByRole("switch").getAttribute("aria-label"));
    expect(tagged).toEqual(["セルフケア", "着用", "症状"]);
  });

  it("moves a module up with the button and stores the order", () => {
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    fireEvent.click(within(row("周径")).getByRole("button", { name: "上へ" }));
    fireEvent.click(within(row("周径")).getByRole("button", { name: "上へ" }));

    expect(rowNames()).toEqual(["周径", "体調", "身体", "写真", "セルフケア", "着用", "症状"]);
    const stored = JSON.parse(window.localStorage.getItem("lymly-record-modules")!);
    expect(stored.order).toEqual(["circumference", "wellness", "body", "photo", "selfcare", "compression", "symptoms"]);
  });

  it("disables the first row's up button and the last row's down button", () => {
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });

    const all = rows();
    expect((within(all[0]).getByRole("button", { name: "上へ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(all[all.length - 1]).getByRole("button", { name: "下へ" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(all[0]).getByRole("button", { name: "下へ" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("turning a module OFF stores it and removes its item from the add menu", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    fireEvent.click(within(row("身体")).getByRole("switch"));

    const stored = JSON.parse(window.localStorage.getItem("lymly-record-modules")!);
    expect(stored.disabled).toEqual(["body"]);
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["体調", "周径", "写真", "セルフケア", "着用", "症状"]);
  });
});
