import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { girthRepository } from "./data";
import { GirthForm } from "./girth-form";

function renderForm() {
  const onSaved = vi.fn();
  renderWithLanguage(<GirthForm date="2026-10-20" onOpenChange={vi.fn()} onSaved={onSaved} />, {
    initialLanguage: "ja",
  });
  return { onSaved };
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const save = () => screen.getByRole("button", { name: "保存" }) as HTMLButtonElement;

describe("GirthForm", () => {
  beforeEach(async () => {
    await Promise.all([appDb.girthRecords.clear(), appDb.tombstones.clear()]);
  });

  it("saves chest and waist", async () => {
    const { onSaved } = renderForm();
    fireEvent.change(input("胸囲"), { target: { value: "92.5" } });
    fireEvent.change(input("腹囲（へその高さ）"), { target: { value: "80.1" } });
    fireEvent.click(save());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const all = await girthRepository.listInDayRange("2026-10-20", "2026-10-20");
    expect(all).toHaveLength(1);
    expect(all[0].values).toEqual({ chest: 92.5, waist: 80.1 });
  });

  it("rejects out-of-range values", () => {
    renderForm();
    for (const value of ["29.9", "250.1"]) {
      fireEvent.change(input("胸囲"), { target: { value } });
      expect(save().disabled).toBe(true);
    }
    fireEvent.change(input("胸囲"), { target: { value: "90" } });
    expect(save().disabled).toBe(false);
    expect(within(document.body).queryByRole("alert")).toBeNull();
  });
});
