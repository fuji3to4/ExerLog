import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { Table } from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { circumferenceRepository } from "@/features/modules/circumference/data";
import { appDb } from "@/features/storage/app-db";
import { localIsoAt } from "@/lib/date/local-iso";
import type { CustomRecord, CustomValue, MeasurementRecord } from "@/lib/types";
import { addBuiltinRecord } from "@/test/builtin-records";
import { renderWithLanguage } from "@/test/render-with-language";
import { getRecordModule } from "../registry";
import type { ModuleRecord } from "../types";
import { ModuleRecordDialog } from "./module-record-dialog";

const DATE = "2026-10-20";

function renderDialog(moduleId: string, props: { record?: ModuleRecord; onDeleted?(): void } = {}) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const utils = renderWithLanguage(
    <ModuleRecordDialog
      module={getRecordModule(moduleId)!}
      open
      onOpenChange={onOpenChange}
      date={DATE}
      onSaved={onSaved}
      {...props}
    />,
    { initialLanguage: "ja" },
  );
  return { ...utils, onSaved, onOpenChange };
}

function input(label: string | RegExp) {
  return within(screen.getByRole("dialog")).getByLabelText(label) as HTMLInputElement;
}

function saveButton() {
  return within(screen.getByRole("dialog")).getByRole("button", { name: "保存" }) as HTMLButtonElement;
}

async function onlyRecord(table: Table<MeasurementRecord, string>): Promise<MeasurementRecord> {
  const all = await table.toArray();
  expect(all).toHaveLength(1);
  return all[0];
}

async function onlyCustomRecord(typeId: string): Promise<CustomRecord> {
  const all = await appDb.customRecords.where("typeId").equals(typeId).toArray();
  expect(all).toHaveLength(1);
  return all[0];
}

function addBody(values: Record<string, CustomValue>, note = "") {
  return addBuiltinRecord("body", { date: DATE, recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)), values, note });
}

function pressScore(dialog: HTMLElement, group: string, score: string) {
  fireEvent.click(within(within(dialog).getByRole("group", { name: group })).getByRole("button", { name: score }));
}

describe("ModuleRecordDialog", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 7, 12, 0));
    window.localStorage.clear();
    await Promise.all([
      appDb.customRecords.clear(),
      appDb.circumferenceRecords.clear(),
      appDb.tombstones.clear(),
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the wellness form under the add title without kind tabs", async () => {
    renderDialog("wellness");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "体調を記録" })).toBeTruthy();
    expect(within(dialog).queryByRole("tablist")).toBeNull();
    expect(within(dialog).getByRole("group", { name: "からだの調子" })).toBeTruthy();
    expect(within(dialog).queryByLabelText(/^体重/)).toBeNull();
  });

  it("saves a wellness entry", async () => {
    const { onSaved } = renderDialog("wellness");

    const dialog = await screen.findByRole("dialog");
    pressScore(dialog, "からだの調子", "4");
    pressScore(dialog, "こころの調子", "3");
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const entry = await onlyCustomRecord("wellness");
    expect(entry.values).toEqual({ physical: 4, mental: 3 });
    expect(entry.date).toBe(DATE);
    expect(onSaved).toHaveBeenCalledWith(entry.id);
  });

  it("saves a body record only to the body table", async () => {
    const { onSaved } = renderDialog("body");

    fireEvent.change(input(/^体重/), { target: { value: "60.2" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const record = await onlyCustomRecord("body");
    expect(record.values).toEqual({ weight: 60.2 });
    expect(record.date).toBe(DATE);
    expect(record.recordedAt.slice(11, 16)).toBe("07:12");
    expect(onSaved).toHaveBeenCalledWith(record.id);
    expect(await appDb.circumferenceRecords.count()).toBe(0);
  });

  it("saves a circumference record only to the circumference table", async () => {
    const { onSaved } = renderDialog("circumference");

    fireEvent.change(input("手首 左"), { target: { value: "15.0" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const record = await onlyRecord(appDb.circumferenceRecords);
    expect(record.values).toEqual({ armWristLeft: 15 });
    expect(onSaved).toHaveBeenCalledWith(record.id);
    expect(await appDb.customRecords.count()).toBe(0);
  });

  it("shows only body fields on 身体", async () => {
    renderDialog("body");

    const dialog = within(screen.getByRole("dialog"));
    expect(input(/^体重/)).toBeTruthy();
    expect(dialog.queryByLabelText("手首 左")).toBeNull();
    expect(dialog.queryByRole("button", { name: "測る位置の説明" })).toBeNull();
  });

  it("shows only circumference fields on 腕・脚周径", async () => {
    renderDialog("circumference");

    const dialog = within(screen.getByRole("dialog"));
    expect(input("手首 左")).toBeTruthy();
    expect(dialog.queryByLabelText(/^体重/)).toBeNull();
    expect(dialog.queryByLabelText(/^身長/)).toBeNull();
  });

  it("disables save on 腕・脚周径 while every field is empty", async () => {
    renderDialog("circumference");

    expect(saveButton().disabled).toBe(true);
    fireEvent.change(input("手首 左"), { target: { value: "15.0" } });
    expect(saveButton().disabled).toBe(false);
  });

  it("keeps values that are not edited and shows only the body form when editing", async () => {
    const record = await addBody({ weight: 61, waist: 80 }, "朝");
    const { onSaved } = renderDialog("body", { record });

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "「身体」を編集" })).toBeTruthy();
    expect(within(dialog).queryByLabelText("手首 左")).toBeNull();
    expect(input(/^体重/).value).toBe("61");
    fireEvent.change(input(/^体重/), { target: { value: "62" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(record.id), { timeout: 3000 });
    const saved = await onlyCustomRecord("body");
    expect(saved.values).toEqual({ weight: 62, waist: 80 });
    expect(saved.note).toBe("朝");
  });

  it("removes a listed item whose field is cleared while editing", async () => {
    const record = await addBody({ weight: 61, bodyFat: 22 });
    const { onSaved } = renderDialog("body", { record });

    fireEvent.change(await waitFor(() => input(/^体脂肪率/)), { target: { value: "" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect((await onlyCustomRecord("body")).values).toEqual({ weight: 61 });
  });

  it("saves a stored value that fails validation when only the note is edited", async () => {
    const record = await addBody({ weight: 60.25 });
    const { onSaved } = renderDialog("body", { record });

    fireEvent.change(await waitFor(() => input("メモ")), { target: { value: "読み込み" } });
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const saved = await onlyCustomRecord("body");
    expect(saved.values).toEqual({ weight: 60.25 });
    expect(saved.note).toBe("読み込み");
  });

  it("deletes a body record with a Custom_body tombstone", async () => {
    const record = await addBody({ weight: 61 });
    const onDeleted = vi.fn();
    renderDialog("body", { record, onDeleted });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(await appDb.customRecords.count()).toBe(0);
    expect((await appDb.tombstones.toArray()).map((t) => t.table)).toEqual(["Custom_body"]);
  });

  it("shows the wellness form under the edit title when editing a wellness entry", async () => {
    const entry: CustomRecord = {
      id: "w1",
      typeId: "wellness",
      date: DATE,
      recordedAt: localIsoAt(DATE),
      values: { physical: 2, mental: 4 },
      note: "",
      updatedAt: localIsoAt(DATE),
    };
    renderDialog("wellness", { record: entry });

    const dialog = await screen.findByRole("dialog");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(within(dialog).getByRole("heading", { name: "「体調」を編集" })).toBeTruthy();
    expect(within(dialog).queryByLabelText(/^体重/)).toBeNull();
  });

  it("edits a wellness entry", async () => {
    const entry = await addBuiltinRecord("wellness", {
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)),
      values: { physical: 2, mental: 4 },
    });
    const { onSaved } = renderDialog("wellness", { record: entry });

    const dialog = await screen.findByRole("dialog");
    pressScore(dialog, "こころの調子", "5");
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(entry.id), { timeout: 3000 });
    const saved = await onlyCustomRecord("wellness");
    expect(saved).toMatchObject({ id: entry.id, values: { physical: 2, mental: 5 } });
  });

  it("deletes a wellness entry with a Custom_wellness tombstone", async () => {
    const entry = await addBuiltinRecord("wellness", { date: DATE, values: { physical: 3, mental: 3 } });
    const onDeleted = vi.fn();
    renderDialog("wellness", { record: entry, onDeleted });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(await appDb.customRecords.count()).toBe(0);
    expect((await appDb.tombstones.toArray()).map((t) => t.table)).toEqual(["Custom_wellness"]);
  });

  describe("circumference", () => {
    it("opens on the remembered limb and shows left/right fields for its five sites only", async () => {
      window.localStorage.setItem("exerlog-circumference-limb", "leg");
      renderDialog("circumference");
      expect(screen.getByRole("tab", { name: "脚" }).getAttribute("aria-selected")).toBe("true");
      expect(input("足首 左")).toBeTruthy();
      expect(within(screen.getByRole("dialog")).queryByLabelText("手首 左")).toBeNull();
    });

    it("keeps arm values when switching to leg and saves both in one record", async () => {
      const { onSaved } = renderDialog("circumference");
      fireEvent.change(input("肘下5cm 右"), { target: { value: "24.5" } });
      fireEvent.click(screen.getByRole("tab", { name: "脚" }));
      fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
      fireEvent.click(screen.getByRole("tab", { name: "腕" }));
      expect(input("肘下5cm 右").value).toBe("24.5");
      fireEvent.click(saveButton());
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect((await onlyRecord(appDb.circumferenceRecords)).values).toEqual({
        armBelowElbowRight: 24.5,
        legAnkleLeft: 21,
      });
      expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("arm");
    });

    it("blocks saving and marks the hidden limb when it holds an invalid value", async () => {
      renderDialog("circumference");
      fireEvent.change(input("手首 左"), { target: { value: "200" } });
      fireEvent.click(screen.getByRole("tab", { name: "脚" }));
      fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
      expect(saveButton().disabled).toBe(true);
      expect(screen.getByRole("tab", { name: /腕/ }).textContent).toContain("⚠");
      expect(
        within(screen.getByRole("tab", { name: /腕/ })).getByRole("img", { name: "腕に正しくない値があります" }),
      ).toBeTruthy();
    });

    it("opens the measuring help for the selected limb", async () => {
      window.localStorage.setItem("exerlog-circumference-limb", "leg");
      renderDialog("circumference");
      fireEvent.click(screen.getByRole("button", { name: "測る位置の説明" }));
      const help = await screen.findByRole("dialog", { name: "脚の測り方" });
      expect(within(help).getByText(/土踏まずのアーチ/)).toBeTruthy();
      expect(within(help).getByRole("img")).toBeTruthy();
      expect(within(help).queryByText(/こぶしを握った/)).toBeNull();
    });

    it("shows the arm help when the arm is selected", async () => {
      renderDialog("circumference");
      fireEvent.click(screen.getByRole("button", { name: "測る位置の説明" }));
      const help = await screen.findByRole("dialog", { name: "腕の測り方" });
      expect(within(help).getByText(/こぶしを握った/)).toBeTruthy();
    });

    it("shows the previous value of each side as a placeholder", async () => {
      await circumferenceRepository.add({
        date: "2026-10-19",
        recordedAt: localIsoAt("2026-10-19", new Date(2026, 9, 19, 21, 0, 0)),
        values: { armBelowElbowRight: 24.5 },
        note: "",
      });
      renderDialog("circumference");
      await waitFor(() => expect(input("肘下5cm 右").placeholder).toBe("前回 24.5"));
      expect(input("肘下5cm 左").placeholder).toBe("");
    });

    it("shows only the circumference form when editing and opens a leg-only record on 脚", async () => {
      const record = await circumferenceRepository.add({
        date: DATE,
        recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 6, 0, 0)),
        values: { legAnkleLeft: 21 },
        note: "",
      });
      window.localStorage.setItem("exerlog-circumference-limb", "arm");
      renderDialog("circumference", { record });
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: "腕・脚周径の記録を編集" })).toBeTruthy();
      expect(within(dialog).queryByLabelText(/^体重/)).toBeNull();
      expect((await screen.findByRole("tab", { name: "脚" })).getAttribute("aria-selected")).toBe("true");
      expect(input("足首 左").value).toBe("21");
    });

    it("deletes a circumference record with a Circumference tombstone", async () => {
      const record = await circumferenceRepository.add({ date: DATE, values: { armWristLeft: 15 }, note: "" });
      const onDeleted = vi.fn();
      renderDialog("circumference", { record, onDeleted });

      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
      fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
      expect(await appDb.circumferenceRecords.count()).toBe(0);
      expect((await appDb.tombstones.toArray()).map((t) => t.table)).toEqual(["Circumference"]);
    });
  });
});
