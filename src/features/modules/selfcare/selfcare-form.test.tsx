import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { SelfCareForm } from "./selfcare-form";

const DATE = "2026-10-20";

function renderForm() {
  const onSaved = vi.fn();
  renderWithLanguage(<SelfCareForm onOpenChange={vi.fn()} date={DATE} onSaved={onSaved} />, {
    initialLanguage: "ja",
  });
  return { onSaved };
}

beforeEach(async () => {
  await appDb.selfCareRecords.clear();
});

describe("SelfCareForm", () => {
  it("starts on skin care without a minutes field", () => {
    renderForm();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "スキンケア" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByLabelText("分数")).toBeNull();
  });

  it("shows the minutes field for exercise and saves the minutes", async () => {
    const { onSaved } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "運動" }));
    fireEvent.change(screen.getByLabelText("分数"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    const records = await appDb.selfCareRecords.toArray();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ item: "exercise", minutes: 30 });
  });

  it("saves other with an empty note", async () => {
    const { onSaved } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "その他" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.selfCareRecords.toArray()).toMatchObject([{ item: "other", minutes: null, note: "" }]);
  });
});
