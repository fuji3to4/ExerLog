import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import type { CustomRecord, CustomRecordType } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { CustomRecordForm } from "./custom-form";
import { parseDefinition } from "./definition";

const parsed = parseDefinition({
  exerlogRecordType: 1,
  id: "protein",
  name: "プロテイン",
  icon: "🥤",
  color: "#5f9e7a",
  fields: [
    { id: "amount", label: "量", type: "number", unit: "g", min: 0, max: 200, step: 1, required: true },
    { id: "kind", label: "種類", type: "choice", options: [{ id: "whey", label: "ホエイ" }, { id: "soy", label: "ソイ" }] },
    { id: "timing", label: "タイミング", type: "multiChoice", options: [{ id: "wake", label: "起床時" }, { id: "post", label: "トレ後" }] },
    { id: "fasted", label: "空腹時", type: "boolean" },
    { id: "brand", label: "銘柄", type: "text" },
    { id: "taste", label: "おいしさ", type: "scale", levels: 5, lowLabel: "いまいち", highLabel: "おいしい" },
  ],
});
if (!parsed.ok) throw new Error("fixture");
const type: CustomRecordType = { id: "protein", definition: parsed.definition, deleted: false, updatedAt: "" };
const DATE = "2026-10-20";

function renderForm(record?: CustomRecord) {
  const onSaved = vi.fn();
  renderWithLanguage(
    <CustomRecordForm definition={type.definition} onOpenChange={vi.fn()} date={DATE} record={record} onSaved={onSaved} />,
    { initialLanguage: "ja" },
  );
  return { onSaved };
}

beforeEach(async () => {
  await appDb.customRecords.clear();
});

describe("CustomRecordForm", () => {
  it("renders an input per field type", () => {
    renderForm();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "銘柄" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "おいしさ" }).querySelectorAll("button")).toHaveLength(5);
    expect(screen.getByLabelText("メモ")).toBeInTheDocument();
  });

  it("does not save without a required value", async () => {
    const { onSaved } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("必須です")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(await appDb.customRecords.count()).toBe(0);
  });

  it("does not save a value outside min/max", async () => {
    const { onSaved } = renderForm();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("0〜200 で入れてください")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves the entered values", async () => {
    const { onSaved } = renderForm();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("radio", { name: "ホエイ" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    const records = await appDb.customRecords.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].values).toEqual({ amount: 30, kind: "whey", fasted: false });
  });

  it("keeps values of fields not in the definition when editing", async () => {
    const record: CustomRecord = {
      id: "r1",
      typeId: "protein",
      date: DATE,
      recordedAt: `${DATE}T08:00:00+09:00`,
      values: { amount: 20, legacy: "x" },
      note: "",
      updatedAt: "",
    };
    await appDb.customRecords.add(record);
    const { onSaved } = renderForm(record);
    expect(screen.queryByDisplayValue("x")).toBeNull();
    expect(screen.getByRole("spinbutton")).toHaveValue(20);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect((await appDb.customRecords.get("r1"))?.values).toEqual({ amount: 25, fasted: false, legacy: "x" });
  });

  it("saves true when the switch is toggled on", async () => {
    const { onSaved } = renderForm();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect((await appDb.customRecords.toArray())[0].values.fasted).toBe(true);
  });

  it("keeps an explicit false when editing", async () => {
    const record: CustomRecord = {
      id: "r2",
      typeId: "protein",
      date: DATE,
      recordedAt: `${DATE}T08:00:00+09:00`,
      values: { amount: 20, fasted: false },
      note: "",
      updatedAt: "",
    };
    await appDb.customRecords.add(record);
    const { onSaved } = renderForm(record);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect((await appDb.customRecords.get("r2"))?.values.fasted).toBe(false);
  });

  it("shows and keeps raw sheet strings of restored fields", async () => {
    const record: CustomRecord = {
      id: "r3",
      typeId: "protein",
      date: DATE,
      recordedAt: `${DATE}T08:00:00+09:00`,
      values: { amount: "30", timing: "wake|post", fasted: "1", taste: "4" },
      note: "",
      updatedAt: "",
    };
    await appDb.customRecords.add(record);
    const { onSaved } = renderForm(record);
    expect(screen.getByRole("spinbutton")).toHaveValue(30);
    expect(screen.getByRole("checkbox", { name: "起床時" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "トレ後" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect((await appDb.customRecords.get("r3"))?.values).toEqual({
      amount: 30,
      timing: ["wake", "post"],
      fasted: true,
      taste: 4,
    });
  });
});
