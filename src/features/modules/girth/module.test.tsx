import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { ModuleSettingsSection } from "@/features/modules/components/module-settings-section";
import { renderWithLanguage } from "@/test/render-with-language";

describe("girth module registration", () => {
  it("renders English labels", () => {
    window.localStorage.removeItem("lymly-record-modules");
    renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "en" });
    expect(screen.getByLabelText("Chest & waist")).toBeTruthy();
    expect(screen.queryByText(/胸囲|腹囲/)).toBeNull();
  });
});
