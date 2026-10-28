import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { localIsoAt } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { SymptomsForm } from "./symptoms-form";

const DATE = "2026-10-20";

function renderForm() {
  const onSaved = vi.fn();
  renderWithLanguage(<SymptomsForm onOpenChange={vi.fn()} date={DATE} onSaved={onSaved} />, { initialLanguage: "ja" });
  return { onSaved };
}

beforeEach(async () => {
  await appDb.symptomRecords.clear();
});

describe("SymptomsForm", () => {
  it("saves a record with no symptoms from the 症状なし button, once even if tapped twice", async () => {
    const { onSaved } = renderForm();
    const button = screen.getByRole("button", { name: "症状なし" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.symptomRecords.toArray()).toMatchObject([{ symptoms: [] }]);
  });

  it("disables 症状なし once a symptom is chosen and shows severity and sites", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "むくみ" }));
    expect((screen.getByRole("button", { name: "症状なし" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["軽", "中", "強"]);
    expect(screen.getByRole("button", { name: "左腕" })).toBeTruthy();
  });

  it("saves the chosen severity and site, and a pressed severity toggles off", async () => {
    const { onSaved } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "むくみ" }));
    fireEvent.click(screen.getByRole("radio", { name: "強" }));
    fireEvent.click(screen.getByRole("radio", { name: "強" }));
    expect(screen.getByRole("radio", { name: "強" }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("radio", { name: "中" }));
    fireEvent.click(screen.getByRole("button", { name: "左腕" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    const [saved] = await appDb.symptomRecords.toArray();
    expect(saved.symptoms).toEqual([{ id: "edema", severity: 2, sites: ["armLeft"], care: null }]);
  });

  it("shows no site field for fatigue", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "疲れやすさ" }));
    expect(screen.queryByRole("button", { name: "左腕" })).toBeNull();
  });

  it("shows the care level instead of severity for cellulitis", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "蜂窩織炎" }));
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["入院", "通院", "治療なし"]);
    fireEvent.click(screen.getByRole("radio", { name: "通院" }));
    expect(screen.getByRole("radio", { name: "通院" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "通院" }));
    expect(screen.getByRole("radio", { name: "通院" }).getAttribute("aria-checked")).toBe("false");
  });

  it("saves edits to a 症状なし record while keeping it empty", async () => {
    const at = localIsoAt(DATE);
    const record = { id: "none1", date: DATE, recordedAt: at, symptoms: [], note: "", updatedAt: at };
    await appDb.symptomRecords.add(record);
    const onSaved = vi.fn();
    renderWithLanguage(<SymptomsForm onOpenChange={vi.fn()} date={DATE} record={record} onSaved={onSaved} />, {
      initialLanguage: "ja",
    });
    const save = screen.getByRole("button", { name: "保存" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("メモ"), { target: { value: "夕方" } });
    fireEvent.click(save);
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.symptomRecords.toArray()).toMatchObject([{ id: "none1", symptoms: [], note: "夕方" }]);
  });

  it("cannot save while no symptom is chosen", () => {
    renderForm();
    expect((screen.getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
